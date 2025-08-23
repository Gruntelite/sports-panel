
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as Brevo from '@getbrevo/brevo';

const SendEmailInputSchema = z.object({
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
  })),
  subject: z.string(),
  body: z.string(),
  apiKey: z.string(),
  fromEmail: z.string(),
  replyToEmail: z.string().email(),
  clubName: z.string(),
});

const SendEmailOutputSchema = z.object({
  success: z.boolean(),
  sentCount: z.number(),
  error: z.string().optional(),
});

export const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: SendEmailOutputSchema,
  },
  async ({ recipients, subject, body, apiKey, fromEmail, replyToEmail, clubName }) => {
    
    if (!recipients || recipients.length === 0) {
        return { success: true, sentCount: 0 };
    }

    const api = new Brevo.TransactionalEmailsApi();
    api.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    
    let sentCount = 0;
    const errors = [];

    // Brevo API allows sending to multiple recipients in a single call,
    // but sending one by one gives better error handling per recipient.
    for (const recipient of recipients) {
      if (!recipient.email) continue;
      
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.to = [{ email: recipient.email, name: recipient.name }];
      sendSmtpEmail.sender = { email: fromEmail, name: clubName };
      sendSmtpEmail.replyTo = { email: replyToEmail, name: clubName };
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = body.replace(/\n/g, '<br>');

      try {
        await api.sendTransacEmail(sendSmtpEmail);
        sentCount++;
      } catch (error: any) {
        const errorMessage = error.response?.body?.message || error.message || 'Error desconocido';
        console.error(`Failed to send email to ${recipient.email} via Brevo:`, errorMessage);
        errors.push(errorMessage);
      }
    }

    if (sentCount > 0) {
      return { success: true, sentCount: sentCount };
    } else {
      return { 
        success: false, 
        sentCount: 0, 
        error: `Todos los correos fallaron. Último error: ${errors[errors.length - 1] || 'Error desconocido'}`
      };
    }
  }
);
