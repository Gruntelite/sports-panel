
'use server';
/**
 * @fileOverview A flow to process queued email batches for data update requests.
 * This flow is designed to be triggered by a scheduler.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getClubConfig, getBatchToProcess, updateBatchWithResults, finalizeBatch, createDataUpdateTokens } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';


const ProcessEmailBatchInputSchema = z.object({
  limit: z.number().optional().default(20).describe('The number of emails to process in this batch.'),
  batchId: z.string().optional().describe('The specific batch ID to process.'),
});
export type ProcessEmailBatchInput = z.infer<typeof ProcessEmailBatchInputSchema>;

const ProcessEmailBatchOutputSchema = z.object({
  processedCount: z.number().describe('The number of emails successfully processed.'),
  errors: z.array(z.string()).describe('A list of errors that occurred during processing.'),
});
export type ProcessEmailBatchOutput = z.infer<typeof ProcessEmailBatchOutputSchema>;


export const processEmailBatchFlow = ai.defineFlow(
  {
    name: 'processEmailBatchFlow',
    inputSchema: ProcessEmailBatchInputSchema,
    outputSchema: ProcessEmailBatchOutputSchema,
  },
  async (input) => {
    
    const output: ProcessEmailBatchOutput = { processedCount: 0, errors: [] };
    
    // 1. Get a pending batch from the database via a server action
    const batchResult = await getBatchToProcess({ batchId: input.batchId });

    if (!batchResult.success || !batchResult.batch) {
        if (batchResult.error) output.errors.push(batchResult.error);
        if(batchResult.batch === null && !input.batchId) { // No pending batches found
            console.log("No pending email batches to process.");
            return { processedCount: 0, errors: [] };
        }
        if(!batchResult.batch && input.batchId) {
            const errorMsg = `Could not find batch with ID: ${input.batchId}`;
            console.error(errorMsg);
            output.errors.push(errorMsg);
            return output;
        }
        return output;
    }
    
    const { batch, clubId, batchDocPath } = batchResult;

    // 2. Get club-specific configuration (like API keys) via a server action
    const configResult = await getClubConfig({ clubId });
    if (!configResult.success || !configResult.config) {
        const errorMsg = configResult.error || "Could not retrieve club config.";
        await finalizeBatch({ batchDocPath, status: 'failed', error: errorMsg });
        output.errors.push(errorMsg);
        return output;
    }
    const { clubName, fromEmail, apiKey } = configResult.config;
    
    if (!apiKey) {
        const errorMsg = `No SendGrid API Key is configured for the platform. Email sending is disabled.`;
        await finalizeBatch({ batchDocPath, status: 'failed', error: errorMsg });
        output.errors.push(errorMsg);
        return output;
    }
    
    const sgMail = await import('@sendgrid/mail');
    sgMail.setApiKey(apiKey);

    // 3. Process the recipients
    const recipients = batch.recipients || [];
    const pendingRecipients = recipients.filter((r: any) => r.status === 'pending').slice(0, input.limit);

    if (pendingRecipients.length === 0) {
        await finalizeBatch({ batchDocPath, status: 'completed' });
        return output;
    }
    
    // Create tokens for all pending recipients before sending emails
    const tokensToCreate = pendingRecipients.map(recipient => ({
      clubId,
      recipient,
      fieldConfig: batch.fieldConfig || {},
      token: uuidv4()
    }));
    await createDataUpdateTokens({ tokensToCreate });
    
    const defaultSubject = `Actualización de datos para ${clubName}`;
    const defaultBody = `
        <p>Hola [Nombre del Miembro],</p>
        <p>Por favor, ayúdanos a mantener tus datos actualizados. Haz clic en el siguiente enlace para revisar y confirmar tu información.</p>
        <p style="text-align: center; margin: 20px 0;">
            <a href="[updateLink]" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Actualizar mis datos</a>
        </p>
        <p>El enlace es personal y solo será válido durante los próximos 7 días.</p>
        <p>Gracias,</p>
        <p>El equipo de ${clubName}</p>
    `;

    const processPromises = pendingRecipients.map(async (recipient: any) => {
        try {
            const tokenData = tokensToCreate.find(t => t.recipient.id === recipient.id);
            const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
                ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
                : 'http://localhost:9002';
            const updateLink = `${baseUrl}/update-data?token=${tokenData?.token}`;
            
            const emailBody = (batch.emailBody || defaultBody)
                .replace(/\[Nombre del Miembro\]/g, recipient.name)
                .replace(/\[updateLink\]/g, updateLink);

            const msg = {
                to: recipient.email,
                from: {
                  email: fromEmail,
                  name: `${clubName}`
                },
                subject: batch.emailSubject || defaultSubject,
                html: emailBody,
            };

            await sgMail.send(msg);
            return { id: recipient.id, status: 'sent' };
        } catch (error: any) {
            console.error(`Failed to send email to ${recipient.email}:`, error.response?.body || error);
            output.errors.push(`Failed for ${recipient.email}: ${error.message}`);
            return { id: recipient.id, status: 'failed', error: error.message };
        }
    });

    const results = await Promise.all(processPromises);
    
    // 4. Update the batch document with the results via a server action
    await updateBatchWithResults({ batchDocPath, results, originalRecipients: recipients });

    output.processedCount = results.filter(r => r.status === 'sent').length;
    return output;
  }
);
