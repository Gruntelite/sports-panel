
'use server';
/**
 * @fileOverview A flow to send data update emails directly. This flow invites users to log in and update their data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, Timestamp, setDoc } from 'firebase/firestore';


const SendEmailUpdateInputSchema = z.object({
  clubId: z.string(),
  recipients: z.array(z.any()),
  apiKey: z.string(),
  fromEmail: z.string(),
  clubName: z.string(),
  // fieldConfig is no longer needed in this simplified flow
});
export type SendEmailUpdateInput = z.infer<typeof SendEmailUpdateInputSchema>;

const SendEmailUpdateOutputSchema = z.object({
  success: z.boolean(),
  sentCount: z.number(),
  requeuedCount: z.number().optional(),
  error: z.string().optional(),
});
export type SendEmailUpdateOutput = z.infer<typeof SendEmailUpdateOutputSchema>;

export const sendEmailUpdateFlow = ai.defineFlow(
  {
    name: 'sendEmailUpdateFlow',
    inputSchema: SendEmailUpdateInputSchema,
    outputSchema: SendEmailUpdateOutputSchema,
  },
  async ({ clubId, recipients, apiKey, fromEmail, clubName }) => {
    
    const sgMail = await import('@sendgrid/mail');
    sgMail.setApiKey(apiKey);

    const emailPromises = [];

    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:9002';
    const loginLink = `${baseUrl}/login`;

    for (const recipient of recipients) {
        
        const emailBody = `
            <p>Hola ${recipient.name},</p>
            <p>Por favor, ayúdanos a mantener tus datos actualizados. Inicia sesión en la aplicación para revisar y confirmar tu información en tu perfil.</p>
            <p style="text-align: center; margin: 20px 0;">
                <a href="${loginLink}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acceder a mi cuenta</a>
            </p>
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
        
        // Re-queue failed emails for a later attempt
        if (rejectedRecipients.length > 0) {
            console.log(`Re-queueing ${rejectedRecipients.length} failed emails.`);
            const queueRef = doc(collection(db, 'clubs', clubId, 'emailQueue'));
            await setDoc(queueRef, { 
                recipients: rejectedRecipients, 
                // fieldConfig is no longer needed
                createdAt: Timestamp.now(),
                reason: 'Re-queued after initial send failure',
            });
        }
        
        return { success: true, sentCount, requeuedCount: rejectedRecipients.length };
      }
      
      return { success: true, sentCount: 0, requeuedCount: 0 };

    } catch (error: any) {
      console.error('Error sending emails:', error.response?.body || error);
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Error desconocido al enviar correos.';
      return { success: false, sentCount: 0, requeuedCount: recipients.length, error: errorMessage };
    }
  }
);
