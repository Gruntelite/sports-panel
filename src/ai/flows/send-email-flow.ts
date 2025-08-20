
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
    
    let sentCount = 0;
    const errors = [];

    for (const recipient of recipients) {
      if (!recipient.email) continue;
      
      const msg = {
        to: recipient.email,
        from: { email: fromEmail, name: clubName },
        subject: subject,
        html: body.replace(/\n/g, '<br>'),
      };
      
      try {
        await sgMail.send(msg);
        sentCount++;
      } catch (error: any) {
        const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Error desconocido';
        console.error(`Failed to send email to ${recipient.email}:`, errorMessage);
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
