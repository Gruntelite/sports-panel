
'use server';
/**
 * @fileOverview A flow to send data update emails directly, respecting daily limits.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

const DAILY_LIMIT = 100;

const SendEmailUpdateInputSchema = z.object({
  clubId: z.string(),
  recipients: z.array(z.any()),
  fieldConfig: z.record(z.string()),
});
export type SendEmailUpdateInput = z.infer<typeof SendEmailUpdateInputSchema>;

const SendEmailUpdateOutputSchema = z.object({
  success: z.boolean(),
  sentCount: z.number(),
  queuedCount: z.number(),
  error: z.string().optional(),
});
export type SendEmailUpdateOutput = z.infer<typeof SendEmailUpdateOutputSchema>;

// Helper to get club configuration and daily send limit
async function getClubConfig(clubId: string) {
    const settingsRef = db.collection('clubs').doc(clubId).collection('settings').doc('config');
    const clubRef = db.collection('clubs').doc(clubId);

    const [settingsDoc, clubDoc] = await Promise.all([settingsRef.get(), clubRef.get()]);

    let config = {
      clubName: "Tu Club",
      fromEmail: `notifications@${process.env.GCLOUD_PROJECT || 'sportspanel'}.web.app`,
      apiKey: null as string | null,
      availableToSendToday: DAILY_LIMIT,
    };

    if (clubDoc.exists) {
        config.clubName = clubDoc.data()?.name || "Tu Club";
    }

    if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.fromEmail && data?.senderVerificationStatus === 'verified') {
            config.fromEmail = data.fromEmail;
        }
        config.apiKey = data?.platformSendgridApiKey || null;

        const now = admin.firestore.Timestamp.now();
        const oneDayAgo = now.toMillis() - (24 * 60 * 60 * 1000);
        const lastReset = data?.dailyEmailCountResetTimestamp?.toMillis() || 0;
        let currentCount = data?.dailyEmailCount || 0;

        if (lastReset < oneDayAgo) {
            currentCount = 0;
            // The counter will be reset on the first send of the day
        }
        config.availableToSendToday = DAILY_LIMIT - currentCount;
    }
    return config;
}

export const sendEmailUpdateFlow = ai.defineFlow(
  {
    name: 'sendEmailUpdateFlow',
    inputSchema: SendEmailUpdateInputSchema,
    outputSchema: SendEmailUpdateOutputSchema,
  },
  async ({ clubId, recipients, fieldConfig }) => {
    
    const config = await getClubConfig(clubId);

    if (!config.apiKey) {
      const errorMsg = `No SendGrid API Key is configured for the platform. Email sending is disabled.`;
      console.error(errorMsg);
      return { success: false, sentCount: 0, queuedCount: 0, error: errorMsg };
    }

    const recipientsToSend = recipients.slice(0, config.availableToSendToday);
    const recipientsToQueue = recipients.slice(config.availableToSendToday);

    const sgMail = await import('@sendgrid/mail');
    sgMail.setApiKey(config.apiKey);

    const tokensToCreate: { token: string, clubId: string, memberId: string, memberType: string, fieldConfig: any }[] = [];
    const emailPromises = [];

    for (const recipient of recipientsToSend) {
        const token = uuidv4();
        tokensToCreate.push({ token, clubId, memberId: recipient.id, memberType: recipient.type, fieldConfig });

        const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:9002';
        const updateLink = `${baseUrl}/update-data?token=${token}`;
        
        const emailBody = `
            <p>Hola ${recipient.name},</p>
            <p>Por favor, ayúdanos a mantener tus datos actualizados. Haz clic en el siguiente enlace para revisar y confirmar tu información.</p>
            <p style="text-align: center; margin: 20px 0;">
                <a href="${updateLink}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Actualizar mis datos</a>
            </p>
            <p>El enlace es personal y solo será válido durante los próximos 7 días.</p>
            <p>Gracias,</p>
            <p>El equipo de ${config.clubName}</p>
        `;

        const msg = {
            to: recipient.email,
            from: { email: config.fromEmail, name: config.clubName },
            subject: `Actualización de datos para ${config.clubName}`,
            html: emailBody,
        };
        emailPromises.push(sgMail.send(msg));
    }
    
    let sentCount = 0;
    try {
      if (emailPromises.length > 0) {
        await Promise.all(emailPromises);
        sentCount = emailPromises.length;
      }

      // Create tokens in Firestore
      if (tokensToCreate.length > 0) {
          const tokenBatch = db.batch();
          for (const tokenData of tokensToCreate) {
              const tokenRef = db.collection('dataUpdateTokens').doc(tokenData.token);
              tokenBatch.set(tokenRef, {
                  ...tokenData,
                  expires: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
              });
          }
          await tokenBatch.commit();
      }

      // Queue remaining recipients if any
      if (recipientsToQueue.length > 0) {
          const queueRef = db.collection('clubs').doc(clubId).collection('emailQueue').doc();
          await queueRef.set({
              recipients: recipientsToQueue,
              fieldConfig,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }

      // Update daily send count
      if (sentCount > 0) {
          const settingsRef = db.collection('clubs').doc(clubId).collection('settings').doc('config');
          const settingsDoc = await settingsRef.get();
          const lastReset = settingsDoc.data()?.dailyEmailCountResetTimestamp?.toMillis() || 0;
          const now = admin.firestore.Timestamp.now();

          if (lastReset < now.toMillis() - (24 * 60 * 60 * 1000)) {
               // First send of the day, reset counter before incrementing
               await settingsRef.set({
                    dailyEmailCount: sentCount,
                    dailyEmailCountResetTimestamp: now,
                }, { merge: true });
          } else {
               await settingsRef.update({
                    dailyEmailCount: admin.firestore.FieldValue.increment(sentCount)
               });
          }
      }

      return { success: true, sentCount: sentCount, queuedCount: recipientsToQueue.length };

    } catch (error: any) {
      console.error('Error sending emails:', error.response?.body || error);
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Error desconocido al enviar correos.';
      return { success: false, sentCount: 0, queuedCount: 0, error: errorMessage };
    }
  }
);

    