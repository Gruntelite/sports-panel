
'use server';
/**
 * @fileOverview A flow to send data update emails directly. This flow is simplified to only handle the sending logic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp, setDoc } from 'firebase/firestore';


const SendEmailUpdateInputSchema = z.object({
  clubId: z.string(),
  recipients: z.array(z.any()),
  fieldConfig: z.record(z.string()),
  apiKey: z.string(),
  fromEmail: z.string(),
  clubName: z.string(),
});
export type SendEmailUpdateInput = z.infer<typeof SendEmailUpdateInputSchema>;

const SendEmailUpdateOutputSchema = z.object({
  success: z.boolean(),
  sentCount: z.number(),
  error: z.string().optional(),
});
export type SendEmailUpdateOutput = z.infer<typeof SendEmailUpdateOutputSchema>;

export const sendEmailUpdateFlow = ai.defineFlow(
  {
    name: 'sendEmailUpdateFlow',
    inputSchema: SendEmailUpdateInputSchema,
    outputSchema: SendEmailUpdateOutputSchema,
  },
  async ({ clubId, recipients, fieldConfig, apiKey, fromEmail, clubName }) => {
    
    const sgMail = await import('@sendgrid/mail');
    sgMail.setApiKey(apiKey);

    const tokensToCreate: { token: string, clubId: string, memberId: string, memberType: string, fieldConfig: any }[] = [];
    const emailPromises = [];

    for (const recipient of recipients) {
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
            <p>El equipo de ${clubName}</p>
        `;

        const msg = {
            to: recipient.email,
            from: { email: fromEmail, name: clubName },
            reply_to: fromEmail,
            subject: `Actualización de datos para ${clubName}`,
            html: emailBody,
            asm: { group_id: 12345 }, // Replace with your actual Unsubscribe Group ID
            custom_args: {
                clubId: clubId,
                memberId: recipient.id,
            }
        };
        emailPromises.push(sgMail.send(msg));
    }
    
    let sentCount = 0;
    try {
      if (emailPromises.length > 0) {
        const results = await Promise.allSettled(emailPromises);
        
        const fulfilledIndexes: number[] = [];
        const rejectedRecipients: any[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                fulfilledIndexes.push(index);
            } else {
                rejectedRecipients.push(recipients[index]);
                console.error(`Failed to send email to ${recipients[index].email}:`, result.reason);
            }
        });

        sentCount = fulfilledIndexes.length;

        // Create tokens ONLY for emails that were successfully sent
        if (fulfilledIndexes.length > 0) {
            const tokenBatch = writeBatch(db);
            for (const index of fulfilledIndexes) {
                const tokenData = tokensToCreate[index];
                const tokenRef = doc(db, "dataUpdateTokens", tokenData.token);
                tokenBatch.set(tokenRef, {
                    ...tokenData,
                    expires: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                });
            }
            await tokenBatch.commit();
        }
        
        // Re-queue failed emails for a later attempt
        if (rejectedRecipients.length > 0) {
            console.log(`Re-queueing ${rejectedRecipients.length} failed emails.`);
            const queueRef = doc(collection(db, 'clubs', clubId, 'emailQueue'));
            await setDoc(queueRef, { 
                recipients: rejectedRecipients, 
                fieldConfig, 
                createdAt: Timestamp.now(),
                reason: 'Re-queued after initial send failure',
            });
        }
      }
      
      return { success: true, sentCount };

    } catch (error: any) {
      console.error('Error sending emails:', error.response?.body || error);
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Error desconocido al enviar correos.';
      return { success: false, sentCount: 0, error: errorMessage };
    }
  }
);
