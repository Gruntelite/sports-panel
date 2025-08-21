
"use client";

import { sendEmailFlow } from "@/ai/flows/send-email-flow";
import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, setDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from './firebase'; // Use client SDK


type VerificationInput = {
    clubId: string;
}

export async function initiateSenderVerificationAction(input: VerificationInput) {
    
    const settingsRef = doc(db, "clubs", input.clubId, "settings", "config");
    const settingsSnap = await getDoc(settingsRef);
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;

    if (!settingsData?.sendgridApiKey || !settingsData?.fromEmail) {
        console.error("SendGrid API Key or From Email are not configured for this club.");
        return { success: false, error: "La API Key y el correo del club no están configurados." };
    }
    
    try {
        const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settingsData.sendgridApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nickname: settingsData.fromEmail.split('@')[0],
                from_email: settingsData.fromEmail,
                from_name: 'SportsPanel Sender',
                reply_to: settingsData.fromEmail,
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
  if (!input.clubId) {
    return { success: false, error: "Club ID no proporcionado." };
  }
    const settingsRef = doc(db, "clubs", input.clubId, "settings", "config");
    const settingsSnap = await getDoc(settingsRef);

    if (!settingsSnap.exists()) {
        return { success: false, error: "No se encontraron los ajustes del club." };
    }
    const settingsData = settingsSnap.data();
    const apiKey = settingsData?.sendgridApiKey;
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

async function getClubConfigAndCheckLimit(clubId: string) {
    const settingsRef = doc(db, 'clubs', clubId, 'settings', 'config');
    const clubRef = doc(db, 'clubs', clubId);

    const [settingsDoc, clubDoc] = await Promise.all([getDoc(settingsRef), getDoc(clubRef)]);

    const config = {
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
        config.apiKey = data?.sendgridApiKey || null;

        const now = Timestamp.now();
        const oneDayAgo = now.toMillis() - (24 * 60 * 60 * 1000);
        const lastReset = data?.dailyEmailCountResetTimestamp?.toMillis() || 0;
        
        let currentCount = data?.dailyEmailCount || 0;
        
        if (lastReset < oneDayAgo) {
            await updateDoc(settingsRef, {
                dailyEmailCount: 0,
                dailyEmailCountResetTimestamp: now
            });
            currentCount = 0;
        }

        config.availableToSendToday = DAILY_LIMIT - currentCount;
    }
    return config;
}

export async function sendDirectEmailAction({ clubId, recipients, subject, body }: { clubId: string, recipients: any[], subject: string, body: string }) {
    
    const config = await getClubConfigAndCheckLimit(clubId);
    const { availableToSendToday, apiKey, clubName, fromEmail } = config;
    
    if (!apiKey) {
      const errorMsg = `No SendGrid API Key is configured for this club. Email sending is disabled.`;
      console.error(errorMsg);
      return { success: false, sentCount: 0, queuedCount: 0, error: errorMsg };
    }

    const recipientsToSend = recipients.slice(0, availableToSendToday);
    const recipientsToQueue = recipients.slice(availableToSendToday);

    const result = await sendEmailFlow({
        recipients: recipientsToSend,
        subject,
        body,
        apiKey,
        clubName,
        fromEmail,
    });
    
    if (recipientsToQueue.length > 0) {
        const queueRef = doc(collection(db, 'clubs', clubId, 'emailQueue'));
        await setDoc(queueRef, {
            recipients: recipientsToQueue,
            subject,
            body,
            createdAt: Timestamp.now(),
        });
    }

    if (result.success && result.sentCount > 0) {
        const settingsRef = doc(db, 'clubs', clubId, 'settings', 'config');
        await updateDoc(settingsRef, {
            dailyEmailCount: increment(result.sentCount),
            dailyEmailCountResetTimestamp: Timestamp.now(),
        });
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
