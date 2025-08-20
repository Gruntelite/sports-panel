
"use client";

import { generateCommunicationTemplate, GenerateCommunicationTemplateInput } from "@/ai/flows/generate-communication-template";
import { sendEmailUpdateFlow } from "@/ai/flows/send-email-update";
import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, setDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from './firebase'; 


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
    
    const settingsRef = doc(db, "clubs", input.clubId, "settings", "config");
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
                nickname: input.email.split('@')[0],
                from_email: input.email,
                from_name: 'SportsPanel Sender',
                reply_to: input.email,
                address: '123 Main Street', 
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
    const settingsRef = doc(db, "clubs", input.clubId, "settings", "config");
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

const DAILY_LIMIT = 100;

// Helper to get club configuration and daily send limit
async function getClubConfig(clubId: string) {
    const settingsRef = doc(db, 'clubs', clubId, 'settings', 'config');
    const clubRef = doc(db, 'clubs', clubId);

    const [settingsDoc, clubDoc] = await Promise.all([getDoc(settingsRef), getDoc(clubRef)]);

    let config = {
      clubName: "Tu Club",
      fromEmail: `notifications@${process.env.GCLOUD_PROJECT || 'sportspanel'}.web.app`,
      apiKey: null as string | null,
      availableToSendToday: DAILY_LIMIT,
    };

    if (clubDoc.exists()) {
        config.clubName = clubDoc.data()?.name || "Tu Club";
    }

    if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data?.fromEmail && data?.senderVerificationStatus === 'verified') {
            config.fromEmail = data.fromEmail;
        }
        config.apiKey = data?.platformSendgridApiKey || null;

        const now = Timestamp.now();
        const oneDayAgo = now.toMillis() - (24 * 60 * 60 * 1000);
        const lastReset = data?.dailyEmailCountResetTimestamp?.toMillis() || 0;
        
        let currentCount = data?.dailyEmailCount || 0;
        if (lastReset < oneDayAgo) {
            currentCount = 0;
        }

        config.availableToSendToday = DAILY_LIMIT - currentCount;
    }
    return config;
}


export async function directSendAction({ clubId, recipients, fieldConfig }: { clubId: string, recipients: any[], fieldConfig: any }) {
    
    const config = await getClubConfig(clubId);
    const { availableToSendToday, apiKey, clubName, fromEmail } = config;
    
    if (!apiKey) {
      const errorMsg = `No SendGrid API Key is configured for the platform. Email sending is disabled.`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const recipientsToSend = recipients.slice(0, availableToSendToday);
    const recipientsToQueue = recipients.slice(availableToSendToday);

    const result = await sendEmailUpdateFlow({
        recipients: recipientsToSend,
        fieldConfig,
        apiKey,
        clubName,
        fromEmail,
        clubId,
    });
    
    if (recipientsToQueue.length > 0) {
        const queueRef = doc(collection(db, 'clubs', clubId, 'emailQueue'));
        await setDoc(queueRef, {
            recipients: recipientsToQueue,
            fieldConfig,
            createdAt: Timestamp.now(),
        });
    }

    if (result.success && result.sentCount > 0) {
        const settingsRef = doc(db, 'clubs', clubId, 'settings', 'config');
        const settingsSnap = await getDoc(settingsRef);
        const now = Timestamp.now();
        
        if (!settingsSnap.exists() || !settingsSnap.data()?.dailyEmailCountResetTimestamp || settingsSnap.data()?.dailyEmailCountResetTimestamp.toMillis() < now.toMillis() - (24 * 60 * 60 * 1000)) {
             await setDoc(settingsRef, {
                  dailyEmailCount: result.sentCount,
                  dailyEmailCountResetTimestamp: now,
              }, { merge: true });
        } else {
             await updateDoc(settingsRef, {
                  dailyEmailCount: increment(result.sentCount),
             });
        }
    }

    if (result.success) {
        return {
            success: true,
            title: `¡Envío completado!`,
            description: `Se han enviado ${result.sentCount} correos. ${recipientsToQueue.length > 0 ? `Los ${recipientsToQueue.length} restantes se enviarán automáticamente.` : ''}`
        };
    } else {
        return {
            success: false,
            error: result.error || "Ocurrió un error desconocido durante el envío.",
        };
    }
}

export async function getMemberDataForUpdate({ token }: { token: string }) {
    try {
        const tokenRef = doc(db, "dataUpdateTokens", token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
            return { success: false, error: "El enlace no es válido o ha caducado." };
        }

        const tokenData = tokenSnap.data();
        const now = Timestamp.now();
        if (tokenData.expires.toMillis() < now.toMillis()) {
             await deleteDoc(tokenRef);
             return { success: false, error: "El enlace ha caducado. Por favor, solicita uno nuevo." };
        }
        
        const { clubId, memberId, memberType, fieldConfig } = tokenData;

        let collectionName = "";
        if (memberType === 'Jugador') collectionName = 'players';
        else if (memberType === 'Entrenador') collectionName = 'coaches';
        else if (memberType === 'Staff') collectionName = 'staff';
        else return { success: false, error: "Tipo de miembro no válido." };

        const memberRef = doc(db, "clubs", clubId, collectionName, memberId);
        const memberSnap = await getDoc(memberRef);

        if (!memberSnap.exists()) {
            return { success: false, error: "No se encontró el registro del miembro." };
        }

        const clubDoc = await getDoc(doc(db, 'clubs', clubId));

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
        const tokenRef = doc(db, "dataUpdateTokens", token);
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

        const memberRef = doc(db, "clubs", clubId, collectionName, memberId);
        
        const batch = writeBatch(db);
        batch.update(memberRef, updatedData);
        batch.delete(tokenRef);
        
        await batch.commit();

        return { success: true };

    } catch(error: any) {
        console.error("Error saving member data from update:", error);
        return { success: false, error: "No se pudieron guardar los cambios." };
    }
}
