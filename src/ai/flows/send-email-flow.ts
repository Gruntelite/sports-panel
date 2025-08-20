
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SendEmailInputSchema = z.object({
  recipients: z.array(z.object({
    email: z.string().email(),
    name: z.string(),
  })),
  subject: z.string(),
  body: z.string(),
  apiKey: z.string(),
  fromEmail: z.string(),
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
  async ({ recipients, subject, body, apiKey, fromEmail, clubName }) => {
    
    if (!recipients || recipients.length === 0) {
        return { success: true, sentCount: 0 };
    }

    const sgMail = await import('@sendgrid/mail');
    sgMail.setApiKey(apiKey);

    const emailPromises = recipients.map(recipient => {
        const msg = {
            to: recipient.email,
            from: { email: fromEmail, name: clubName },
            subject: subject,
            html: body.replace(/\n/g, '<br>'), // Simple newline to HTML conversion
        };
        return sgMail.send(msg);
    });
    
    let sentCount = 0;
    try {
      const results = await Promise.allSettled(emailPromises);
      sentCount = results.filter(r => r.status === 'fulfilled').length;
      
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
          console.error('Some emails failed to send:', failed);
      }
      
      return { success: true, sentCount };

    } catch (error: any) {
      console.error('Error sending emails:', error.response?.body || error);
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Error desconocido al enviar correos.';
      return { success: false, sentCount: 0, error: errorMessage };
    }
  }
);
