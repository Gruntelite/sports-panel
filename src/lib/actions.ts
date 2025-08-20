
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

type VerificationInput = {
    email: string;
    clubId: string;
}

export async function initiateSenderVerificationAction(input: VerificationInput) {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
        console.error("SendGrid API Key is not configured on the platform.");
        return { success: false, error: "El servicio de correo no está configurado en la plataforma." };
    }
    
    try {
        const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nickname: input.email.split('@')[0], // A friendly name for the sender
                from_email: input.email,
                from_name: 'SportsPanel Sender', // This can be customized
                reply_to: input.email,
                address: '123 Main Street', // Dummy data required by SendGrid
                city: 'Anytown',
                country: 'USA'
            }),
        });

        const data = await response.json();

        if (response.ok) {
            return { success: true, data: data };
        } else {
            // Check for specific SendGrid errors
            if (data.errors && data.errors.some((e: any) => e.message.includes("already exists"))) {
                 return { success: true, data: "El remitente ya existe y está verificado." };
            }
            console.error('SendGrid API Error:', data.errors);
            return { success: false, error: `Error de SendGrid: ${data.errors?.[0]?.message || 'Ocurrió un error.'}` };
        }
    } catch (error) {
        console.error('Failed to initiate sender verification:', error);
        return { success: false, error: "No se pudo conectar con el servicio de correo." };
    }
}
