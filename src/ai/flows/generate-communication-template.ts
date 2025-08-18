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
    .describe('The purpose of the communication (e.g., announcement, update, reminder).'),
  targetAudience: z
    .string()
    .describe(
      'The intended recipients (e.g., whole club, specific team, individual family/player).' + 
      'If targetting a team or individual, specify the team name or player name.'
    ),
  keyInformation: z
    .string()
    .describe(
      'The core details to be included in the communication, such as dates, times, locations, or important updates.'
    ),
  tone: z
    .string()
    .describe('The desired tone of the communication (e.g., formal, informal, urgent).')
    .optional(),
  additionalContext: z
    .string()
    .describe('Any extra details that might be relevant to the communication.')
    .optional(),
});

export type GenerateCommunicationTemplateInput = z.infer<
  typeof GenerateCommunicationTemplateInputSchema
>;

const GenerateCommunicationTemplateOutputSchema = z.object({
  subject: z.string().describe('The subject line for the communication.'),
  body: z.string().describe('The generated communication template body.'),
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
  prompt: `You are an expert in crafting effective communication templates for sports clubs.

  Based on the provided information, generate a communication template that includes a subject line and a body.
  The template should be suitable for sending to the specified target audience and should effectively convey the key information.
  Consider the tone and any additional context provided to tailor the communication appropriately.

  Goal: {{{communicationGoal}}}
  Audience: {{{targetAudience}}}
  Key Information: {{{keyInformation}}}
  Tone: {{{tone}}}
  Additional Context: {{{additionalContext}}}
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
