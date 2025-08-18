"use server";

import { generateCommunicationTemplate, GenerateCommunicationTemplateInput } from "@/ai/flows/generate-communication-template";

export async function generateTemplateAction(input: GenerateCommunicationTemplateInput) {
  try {
    const result = await generateCommunicationTemplate(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: "No se pudo generar la plantilla. Por favor, inténtalo de nuevo." };
  }
}
