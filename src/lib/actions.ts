
"use client";

import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, setDoc, addDoc } from "firebase/firestore";
import { db, auth } from './firebase'; // Use client SDK
import { createUserWithEmailAndPassword } from "firebase/auth";
import type { ClubSettings, Player, Coach, Staff, Socio } from "./types";
import { sendEmailWithSmtpAction } from "./email";


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

export async function requestDataUpdateAction({
  clubId,
  members,
  memberType,
  fields
}: {
  clubId: string;
  members: { id: string; name: string; email: string }[];
  memberType: 'player' | 'coach';
  fields: string[];
}): Promise<{ success: boolean; error?: string; count?: number }> {
  if (members.length === 0) {
    return { success: false, error: "No se seleccionaron miembros." };
  }

  try {
    const collectionName = memberType === 'player' ? 'players' : 'coaches';
    const batch = writeBatch(db);
    
    members.forEach(member => {
        const memberRef = doc(db, "clubs", clubId, collectionName, member.id);
        batch.update(memberRef, { updateRequestActive: true });
    });
    
    await batch.commit();

    const fieldsQueryParam = fields.join(',');

    const emailRecipients = members.map(m => ({ email: m.email, name: m.name }));
    let emailsSent = 0;
    
    const clubDocRef = doc(db, "clubs", clubId);
    const clubDocSnap = await getDoc(clubDocRef);
    const clubName = clubDocSnap.exists() ? clubDocSnap.data().name : 'Tu Club';

    for (const recipient of emailRecipients) {
        if (!recipient.email) continue;
        
        const memberId = members.find(m => m.email === recipient.email)?.id;
        if (!memberId) continue;

        const updateUrl = `${window.location.origin}/update-profile/${memberId}?type=${memberType}&clubId=${clubId}&fields=${fieldsQueryParam}`;

        const emailResult = await sendEmailWithSmtpAction({
            clubId,
            recipients: [recipient],
            subject: `Actualiza tus datos en ${clubName}`,
            htmlContent: `
                <h1>Actualización de Datos</h1>
                <p>Hola ${recipient.name},</p>
                <p>Por favor, ayúdanos a mantener tu información actualizada. Haz clic en el siguiente enlace para revisar y corregir los datos solicitados:</p>
                <a href="${updateUrl}">Actualizar mis datos</a>
                <p>Este enlace es de un solo uso.</p>
                <p>Gracias,</p>
                <p>El equipo de ${clubName}</p>
            `,
        });

        if (emailResult.success) {
            emailsSent++;
        } else {
            console.warn(`Failed to send email to ${recipient.email}: ${emailResult.error}`);
            // Optionally rollback the updateRequestActive flag for this user
            const memberRef = doc(db, "clubs", clubId, collectionName, memberId);
            await updateDoc(memberRef, { updateRequestActive: false });
        }
    }

    if (emailsSent === 0 && members.length > 0) {
      return { success: false, error: 'No se pudo enviar ningún correo. Revisa la configuración SMTP y que los miembros tengan email.' };
    }

    return { success: true, count: emailsSent };
  } catch (error: any) {
    console.error("Error requesting data update:", error);
    return { success: false, error: error.message };
  }
}

export async function importDataAction({
  clubId,
  importerType,
  data,
}: {
  clubId: string;
  importerType: 'players' | 'coaches' | 'staff' | 'socios';
  data: any[];
}): Promise<{ success: boolean; error?: string; count?: number }> {
    if (!clubId || !importerType || !data || data.length === 0) {
        return { success: false, error: "Datos de importación inválidos." };
    }
    
    try {
        const batch = writeBatch(db);
        const collectionRef = collection(db, "clubs", clubId, importerType);

        let teams: { id: string, name: string }[] = [];
        if (importerType === 'players' || importerType === 'coaches') {
            const teamsSnapshot = await getDocs(collection(db, "clubs", clubId, "teams"));
            teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        }

        data.forEach(item => {
            const docRef = doc(collectionRef); // Creates a new document with a random ID
            
            // For players and coaches, find teamId based on teamName
            if ((importerType === 'players' || importerType === 'coaches') && item.teamName) {
                const team = teams.find(t => t.name.toLowerCase() === item.teamName.toLowerCase());
                if (team) {
                    item.teamId = team.id;
                }
            }

            // Convert boolean-like strings to actual booleans
            for (const key in item) {
                if (typeof item[key] === 'string') {
                    if (item[key].toLowerCase() === 'true') item[key] = true;
                    else if (item[key].toLowerCase() === 'false') item[key] = false;
                }
            }
            
            batch.set(docRef, item);
        });

        await batch.commit();

        return { success: true, count: data.length };

    } catch (error: any) {
        console.error(`Error importing ${importerType}:`, error);
        return { success: false, error: `Ocurrió un error durante la importación: ${error.message}` };
    }
}
