
"use client";

import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, setDoc, deleteDoc, increment, addDoc } from "firebase/firestore";
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

/**
 * Creates an email document in the `mail` collection in Firestore,
 * which is then picked up by the "Trigger Email" Firebase Extension to be sent.
 */
export async function sendEmailWithTriggerExtensionAction({ 
    clubId,
    toUids,
    subject,
    html,
    replyTo
}: {
    clubId: string,
    toUids: string[],
    subject: string,
    html: string,
    replyTo: string
}) {
    if (!clubId || toUids.length === 0 || !subject || !html) {
        return { success: false, error: "Faltan parámetros para enviar el correo." };
    }

    try {
        const mailRef = collection(db, "clubs", clubId, "mail");
        await addDoc(mailRef, {
            to: toUids,
            message: {
                subject: subject,
                html: html,
            },
            replyTo: replyTo,
        });

        return { success: true };

    } catch (error) {
        console.error("Error creating email document in Firestore:", error);
        return { success: false, error: "No se pudo poner el correo en la cola de envío." };
    }
}
