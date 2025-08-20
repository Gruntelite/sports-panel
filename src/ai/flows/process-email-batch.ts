
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


async function getSendGridApiKey(clubId: string): Promise<string | null> {
    const settingsRef = db.collection('clubs').doc(clubId).collection('settings').doc('config');
    const doc = await settingsRef.get();
    if (!doc.exists) {
        console.warn(`Settings not found for club ${clubId}`);
        return null;
    }
    return doc.data()?.sendgridApiKey || null;
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

    const apiKey = await getSendGridApiKey(clubId);
    if (!apiKey) {
        await batchDoc.ref.update({ status: 'failed', error: 'SendGrid API Key is not configured for this club.' });
        output.errors.push(`SendGrid API Key not found for club ${clubId}.`);
        return output;
    }
    sgMail.setApiKey(apiKey);

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
                fieldConfig: batchData.fieldConfig,
                expires: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });

            const msg = {
                to: recipient.email,
                from: 'notifications@yourdomain.com', // This should be a verified sender in SendGrid
                subject: `Actualización de datos para ${batchData.clubName}`,
                html: `
                    <h1>Hola ${recipient.name},</h1>
                    <p>Por favor, ayúdanos a mantener tus datos actualizados. Haz clic en el siguiente enlace para revisar y confirmar tu información.</p>
                    <a href="${updateLink}">Actualizar mis datos</a>
                    <p>Este enlace es válido por 7 días.</p>
                    <p>Gracias,</p>
                    <p>El equipo de ${batchData.clubName}</p>
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
    }

    output.processedCount = results.filter(r => r.status === 'sent').length;
    return output;
  }
);
