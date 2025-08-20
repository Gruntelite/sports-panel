
"use server";

import { generateCommunicationTemplate, GenerateCommunicationTemplateInput } from "@/ai/flows/generate-communication-template";
import { sendEmailUpdateFlow } from "@/ai/flows/send-email-update";
import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, serverTimestamp } from "firebase/firestore";
import { db as clientDb } from "./firebase";
import * as admin from 'firebase-admin';

// Initialize admin only if it hasn't been initialized
if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (error: any) {
        if (error.code !== 'app/duplicate-app') {
            console.warn('Admin SDK init failed (expected on client):', error.message);
        }
    }
}

let db: admin.firestore.Firestore;
try {
    db = admin.firestore();
} catch (e) {
    console.warn("Admin firestore could not be initialized");
}

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
    
    const settingsRef = doc(clientDb, "clubs", input.clubId, "settings", "config");
    const settingsSnap = await getDoc(settingsRef);
    const apiKey = settingsSnap.exists() ? settingsSnap.data()?.platformSendgridApiKey : null;

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
            if (data.errors && data.errors.some((e: any) => e.message.includes("already exists"))) {
                 const checkStatusResult = await checkSenderStatusAction(input);
                 if(checkStatusResult.success && checkStatusResult.data.verified) {
                    await updateDoc(settingsRef, { senderVerificationStatus: 'verified' });
                    return { success: true, data: "El remitente ya existe y está verificado." };
                 }
            }
            console.error('SendGrid API Error:', data.errors);
            return { success: false, error: `Error de SendGrid: ${data.errors?.[0]?.message || 'Ocurrió un error.'}` };
        }
    } catch (error) {
        console.error('Failed to initiate sender verification:', error);
        return { success: false, error: "No se pudo conectar con el servicio de correo." };
    }
}

export async function checkSenderStatusAction(input: { clubId: string }) {
    const settingsRef = doc(clientDb, "clubs", input.clubId, "settings", "config");
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
        return { success: false, error: "No se encontraron los ajustes del club." };
    }
    const settingsData = settingsSnap.data();
    const apiKey = settingsData?.platformSendgridApiKey;
    const email = settingsData?.fromEmail;

    if (!apiKey || !email) {
        return { success: false, error: "La API Key o el email no están configurados." };
    }

    try {
        const response = await fetch(`https://api.sendgrid.com/v3/verified_senders`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('SendGrid API Error:', data.errors);
            return { success: false, error: `Error de SendGrid: ${data.errors?.[0]?.message || 'Ocurrió un error.'}` };
        }
        
        const sender = data.results.find((s: any) => s.from_email === email);
        
        if (sender) {
            if (sender.verified) {
                await updateDoc(settingsRef, { senderVerificationStatus: 'verified' });
            }
            return { success: true, data: { verified: sender.verified } };
        } else {
            return { success: false, error: "El remitente no fue encontrado en SendGrid." };
        }
        
    } catch (error) {
        console.error('Failed to check sender status:', error);
        return { success: false, error: "No se pudo conectar con el servicio de correo para verificar el estado." };
    }
}

// New action for direct sending
export async function directSendAction({ clubId, recipients, fieldConfig }: { clubId: string, recipients: any[], fieldConfig: any }) {
    const result = await sendEmailUpdateFlow({
        clubId,
        recipients,
        fieldConfig,
    });

    if (result.success) {
        return {
            success: true,
            title: `¡Envío completado!`,
            description: `Se han enviado ${result.sentCount} correos. ${result.queuedCount > 0 ? `Los ${result.queuedCount} restantes se enviarán automáticamente.` : ''}`
        };
    } else {
        return {
            success: false,
            error: result.error || "Ocurrió un error desconocido durante el envío.",
        };
    }
}

// New actions for the public data update form
export async function getMemberDataForUpdate({ token }: { token: string }) {
    try {
        const tokenRef = doc(clientDb, "dataUpdateTokens", token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
            return { success: false, error: "El enlace no es válido o ha caducado." };
        }

        const tokenData = tokenSnap.data();
        const now = Timestamp.now();
        if (tokenData.expires.toMillis() < now.toMillis()) {
             await doc(clientDb, "dataUpdateTokens", token).delete();
             return { success: false, error: "El enlace ha caducado. Por favor, solicita uno nuevo." };
        }
        
        const { clubId, memberId, memberType, fieldConfig } = tokenData;

        let collectionName = "";
        if (memberType === 'Jugador') collectionName = 'players';
        else if (memberType === 'Entrenador') collectionName = 'coaches';
        else if (memberType === 'Staff') collectionName = 'staff';
        else return { success: false, error: "Tipo de miembro no válido." };

        const memberRef = doc(clientDb, "clubs", clubId, collectionName, memberId);
        const memberSnap = await getDoc(memberRef);

        if (!memberSnap.exists()) {
            return { success: false, error: "No se encontró el registro del miembro." };
        }

        const clubDoc = await getDoc(doc(clientDb, 'clubs', clubId));

        return {
            success: true,
            data: {
                memberData: memberSnap.data(),
                clubName: clubDoc.data()?.name || "Tu Club",
                memberType,
                fieldConfig,
            }
        };

    } catch (error: any) {
        console.error("Error getting member data for update:", error);
        return { success: false, error: "Ocurrió un error al cargar los datos." };
    }
}

export async function saveMemberDataFromUpdate({ token, updatedData }: { token: string, updatedData: any }) {
    try {
         const tokenRef = doc(clientDb, "dataUpdateTokens", token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
            return { success: false, error: "El enlace no es válido o ya ha sido utilizado." };
        }
        const { clubId, memberId, memberType } = tokenSnap.data();

        let collectionName = "";
        if (memberType === 'Jugador') collectionName = 'players';
        else if (memberType === 'Entrenador') collectionName = 'coaches';
        else if (memberType === 'Staff') collectionName = 'staff';
        else return { success: false, error: "Tipo de miembro no válido." };

        const memberRef = doc(clientDb, "clubs", clubId, collectionName, memberId);
        
        const batch = writeBatch(clientDb);
        batch.update(memberRef, updatedData);
        batch.delete(tokenRef); // Invalidate token after use
        
        await batch.commit();

        return { success: true };

    } catch(error: any) {
        console.error("Error saving member data from update:", error);
        return { success: false, error: "No se pudieron guardar los cambios." };
    }
}

    