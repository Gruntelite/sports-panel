
// This file is machine-generated - edit at your own risk!

'use server';

/**
 * @fileOverview Generates personalized communication templates with recipient lists.
 *
 * - generateCommunicationTemplate - A function that generates communication templates.
 * - GenerateCommunicationTemplateInput - The input type for the generateCommunicationTemplate function.
 * - GenerateCommunicationTemplateOutput - The return type for the generateCommunicationTemplate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCommunicationTemplateInputSchema = z.object({
  communicationGoal: z
    .string()
    .describe('El propósito de la comunicación (p. ej., anuncio, actualización, recordatorio).'),
  targetAudience: z
    .string()
    .describe(
      'Los destinatarios previstos (p. ej., todo el club, un equipo específico, una familia/jugador individual).' + 
      'Si se dirige a un equipo o individuo, especifique el nombre del equipo o del jugador.'
    ),
  keyInformation: z
    .string()
    .describe(
      'Los detalles principales que se incluirán en la comunicación, como fechas, horas, lugares o actualizaciones importantes.'
    ),
  tone: z
    .string()
    .describe('El tono deseado de la comunicación (p. ej., formal, informal, urgente).')
    .optional(),
  additionalContext: z
    .string()
    .describe('Cualquier detalle adicional que pueda ser relevante para la comunicación.')
    .optional(),
  paymentInfo: z
    .string()
    .describe('Información sobre un pago a incluir en el email. Incluirá concepto y cantidad.')
    .optional(),
});

export type GenerateCommunicationTemplateInput = z.infer<
  typeof GenerateCommunicationTemplateInputSchema
>;

const GenerateCommunicationTemplateOutputSchema = z.object({
  subject: z.string().describe('La línea de asunto para la comunicación.'),
  body: z.string().describe('El cuerpo de la plantilla de comunicación generada.'),
});

export type GenerateCommunicationTemplateOutput = z.infer<
  typeof GenerateCommunicationTemplateOutputSchema
>;

export async function generateCommunicationTemplate(
  input: GenerateCommunicationTemplateInput
): Promise<GenerateCommunicationTemplateOutput> {
  return generateCommunicationTemplateFlow(input);
}

const generateCommunicationTemplatePrompt = ai.definePrompt({
  name: 'generateCommunicationTemplatePrompt',
  input: {schema: GenerateCommunicationTemplateInputSchema},
  output: {schema: GenerateCommunicationTemplateOutputSchema},
  prompt: `Eres un experto en crear plantillas de comunicación eficaces para clubes deportivos.

  Basándote en la información proporcionada, genera una plantilla de comunicación que incluya una línea de asunto y un cuerpo.
  La plantilla debe ser adecuada para enviarla al público objetivo especificado y debe transmitir eficazmente la información clave.
  Considera el tono y cualquier contexto adicional proporcionado para adaptar la comunicación adecuadamente.
  Si se proporciona información de pago, inclúyela de forma clara y añade un marcador de posición como [Enlace de Pago] para que el usuario pueda insertarlo.

  Objetivo: {{{communicationGoal}}}
  Público: {{{targetAudience}}}
  Información Clave: {{{keyInformation}}}
  Tono: {{{tone}}}
  Contexto Adicional: {{{additionalContext}}}
  {{#if paymentInfo}}
  Información de Pago: {{{paymentInfo}}}
  {{/if}}
  `,
});

const generateCommunicationTemplateFlow = ai.defineFlow(
  {
    name: 'generateCommunicationTemplateFlow',
    inputSchema: GenerateCommunicationTemplateInputSchema,
    outputSchema: GenerateCommunicationTemplateOutputSchema,
  },
  async input => {
    const {output} = await generateCommunicationTemplatePrompt(input);
    return output!;
  }
);
