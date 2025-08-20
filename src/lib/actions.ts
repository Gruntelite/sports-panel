
"use client";

import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, setDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from './firebase'; // Use client SDK


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
  if (!input.clubId) {
    return { success: false, error: "Club ID no proporcionado." };
  }
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
