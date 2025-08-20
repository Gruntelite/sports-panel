
'use server';
/**
 * @fileOverview A flow to process queued email batches for data update requests.
 * This flow is designed to be triggered by a scheduler.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const ProcessEmailBatchInputSchema = z.object({
  limit: z.number().optional().default(20).describe('The number of emails to process in this batch.'),
});
export type ProcessEmailBatchInput = z.infer<typeof ProcessEmailBatchInputSchema>;

const ProcessEmailBatchOutputSchema = z.object({
  processedCount: z.number().describe('The number of emails successfully processed.'),
  errors: z.array(z.string()).describe('A list of errors that occurred during processing.'),
});
export type ProcessEmailBatchOutput = z.infer<typeof ProcessEmailBatchOutputSchema>;


async function getSenderConfig(clubId: string): Promise<{fromEmail: string, apiKey: string | null}> {
    const settingsRef = db.collection('clubs').doc(clubId).collection('settings').doc('config');
    const doc = await settingsRef.get();
    
    // Default platform sender - this should ideally not be used if setup is correct
    let config = {
      fromEmail: `notifications@sportspanel.app`, // Fallback email
      apiKey: process.env.SENDGRID_API_KEY || null,
    };

    if (doc.exists) {
        const data = doc.data();
        // If club has a verified sender, use it. The platform API key is still used for sending.
        if (data?.fromEmail && data?.senderVerificationStatus === 'verified') {
            config.fromEmail = data.fromEmail;
        }
        if (data?.platformSendgridApiKey) {
            config.apiKey = data.platformSendgridApiKey;
        }
    }
    
    return config;
}

export const processEmailBatchFlow = ai.defineFlow(
  {
    name: 'processEmailBatchFlow',
    inputSchema: ProcessEmailBatchInputSchema,
    outputSchema: ProcessEmailBatchOutputSchema,
  },
  async (input) => {
    const output: ProcessEmailBatchOutput = { processedCount: 0, errors: [] };
    
    // Find the first email batch job that is 'pending'
    const batchQuery = db.collectionGroup('emailBatches').where('status', '==', 'pending').limit(1);
    const batchSnapshot = await batchQuery.get();

    if (batchSnapshot.empty) {
        return { ...output, processedCount: 0 };
    }

    const batchDoc = batchSnapshot.docs[0];
    const batchData = batchDoc.data();
    const clubId = batchDoc.ref.parent.parent?.id; //  /clubs/{clubId}/emailBatches/{batchId}

    if (!clubId) {
        await batchDoc.ref.update({ status: 'failed', error: 'Could not determine club ID.' });
        output.errors.push('Could not determine club ID for a batch.');
        return output;
    }
    
    await batchDoc.ref.update({ status: 'processing' });

    const senderConfig = await getSenderConfig(clubId);
    
    const clubName = batchData.clubName || "Tu Club";

    if (!senderConfig.apiKey) {
        const errorMsg = `No SendGrid API Key is configured for the platform. Email sending is disabled.`;
        await batchDoc.ref.update({ status: 'failed', error: errorMsg });
        output.errors.push(errorMsg);
        return output;
    }
    sgMail.setApiKey(senderConfig.apiKey);

    const recipients = batchData.recipients || [];
    const pendingRecipients = recipients.filter((r: any) => r.status === 'pending').slice(0, input.limit);

    if (pendingRecipients.length === 0) {
        await batchDoc.ref.update({ status: 'completed' });
        return output;
    }

    const processPromises = pendingRecipients.map(async (recipient: any) => {
        try {
            // Generate a unique token for the update link
            const token = admin.firestore().collection('dummy').doc().id;
            const updateLink = `https://YOUR_APP_URL/update-data?token=${token}`;
            
            await db.collection('dataUpdateTokens').doc(token).set({
                clubId: clubId,
                memberId: recipient.id,
                memberType: recipient.type,
                fieldConfig: batchData.fieldConfig || {},
                expires: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });

            const msg = {
                to: recipient.email,
                from: {
                  email: senderConfig.fromEmail,
                  name: `${clubName}`
                },
                subject: `Actualización de datos para ${clubName}`,
                html: `
                    <p>Hola ${recipient.name},</p>
                    <p>Por favor, ayúdanos a mantener tus datos actualizados. Haz clic en el siguiente enlace para revisar y confirmar tu información.</p>
                    <p style="text-align: center; margin: 20px 0;">
                        <a href="${updateLink}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Actualizar mis datos</a>
                    </p>
                    <p>El enlace es personal y solo será válido durante los próximos 7 días.</p>
                    <p>Gracias,</p>
                    <p>El equipo de ${clubName}</p>
                `,
            };
            await sgMail.send(msg);
            return { id: recipient.id, status: 'sent' };
        } catch (error: any) {
            console.error(`Failed to send email to ${recipient.email}:`, error);
            output.errors.push(`Failed for ${recipient.email}: ${error.message}`);
            return { id: recipient.id, status: 'failed', error: error.message };
        }
    });

    const results = await Promise.all(processPromises);
    
    // Update the batch document with the results
    const updatedRecipients = [...recipients];
    results.forEach(result => {
        const index = updatedRecipients.findIndex(r => r.id === result.id);
        if (index !== -1) {
            updatedRecipients[index].status = result.status;
            if (result.status === 'failed') {
                updatedRecipients[index].error = result.error;
            }
        }
    });

    await batchDoc.ref.update({ recipients: updatedRecipients });
    
    // Check if the batch is now complete
    const allProcessed = updatedRecipients.every(r => r.status === 'sent' || r.status === 'failed');
    if (allProcessed) {
        await batchDoc.ref.update({ status: 'completed' });
    } else {
        // If there are still pending recipients, set status back to pending to be picked up again
        await batchDoc.ref.update({ status: 'pending' });
    }

    output.processedCount = results.filter(r => r.status === 'sent').length;
    return output;
  }
);
