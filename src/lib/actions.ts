"use server";

import { generateCommunicationTemplate, GenerateCommunicationTemplateInput } from "@/ai/flows/generate-communication-template";

export async function generateTemplateAction(input: GenerateCommunicationTemplateInput) {
  try {
    const result = await generateCommunicationTemplate(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to generate template. Please try again." };
  }
}
