
"use client";

import { sendEmailFlow } from "@/ai/flows/send-email-flow";
import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, setDoc, deleteDoc, increment } from "firebase/firestore";
import { db, auth } from './firebase'; // Use client SDK
import { createUserWithEmailAndPassword } from "firebase/auth";


type VerificationInput = {
    clubId: string;
}

function getLuminance(hex: string): number {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export async function createClubAction(data: { clubName: string, adminName: string, sport: string, email: string, password: string, themeColor: string }): Promise<{success: boolean, error?: string, clubId?: string}> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;

    const clubRef = doc(collection(db, "clubs"));
    const clubId = clubRef.id;

    const batch = writeBatch(db);

    batch.set(clubRef, {
        name: data.clubName,
        sport: data.sport,
        createdAt: Timestamp.now(),
        ownerId: user.uid,
    });

    const rootUserRef = doc(db, "users", user.uid);
    batch.set(rootUserRef, {
        clubId: clubId,
        email: data.email,
    });
    
    const clubUserRef = doc(db, "clubs", clubId, "users", user.uid);
    batch.set(clubUserRef, {
        name: data.adminName,
        email: data.email,
        role: "super-admin",
        createdAt: Timestamp.now(),
    });
    
    const luminance = getLuminance(data.themeColor);
    const foregroundColor = luminance > 0.5 ? '#000000' : '#ffffff';

    const settingsRef = doc(db, "clubs", clubId, "settings", "config");
    batch.set(settingsRef, {
        billingPlan: 'basic',
        themeColor: data.themeColor,
        themeColorForeground: foregroundColor
    });

    await batch.commit();

    return { success: true, clubId };
  } catch (error: any) {
    console.error("Error creating club and user:", error);
    let errorMessage = "Ocurrió un error inesperado durante el registro.";
    if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este correo electrónico ya está en uso por otra cuenta.";
    } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
    } else if (error.code === 'auth/invalid-email') {
        errorMessage = "El formato del correo electrónico no es válido.";
    }
    return { success: false, error: errorMessage };
  }
}

const DAILY_LIMIT = 300; // Brevo free plan limit

async function getClubConfigAndCheckLimit(clubId: string) {
    const settingsRef = doc(db, 'clubs', clubId, 'settings', 'config');
    const clubRef = doc(db, 'clubs', clubId);

    const [settingsDoc, clubDoc] = await Promise.all([getDoc(settingsRef), getDoc(clubRef)]);

    const config = {
      clubName: "Tu Club",
      fromEmail: `notifications@${process.env.GCLOUD_PROJECT || 'sportspanel'}.web.app`,
      replyToEmail: "",
      apiKey: null as string | null,
      availableToSendToday: DAILY_LIMIT,
    };

    if (clubDoc.exists()) {
        config.clubName = clubDoc.data()?.name || "Tu Club";
    }
    
    if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        config.apiKey = data?.brevoApiKey || null;
        config.fromEmail = data?.brevoFromEmail || `notifications@${process.env.GCLOUD_PROJECT || 'sportspanel'}.web.app`;
        config.replyToEmail = data?.brevoReplyToEmail || config.fromEmail;


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
    const { availableToSendToday, apiKey, clubName, fromEmail, replyToEmail } = config;
    
    if (!apiKey) {
      const errorMsg = `No se ha configurado una clave API de Brevo para este club. El envío de correos está deshabilitado.`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
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
        replyToEmail,
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
