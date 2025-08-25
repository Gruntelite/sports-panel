
"use client";

import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, setDoc, addDoc } from "firebase/firestore";
import { db, auth } from './firebase'; // Use client SDK
import { createUserWithEmailAndPassword } from "firebase/auth";
import type { ClubSettings, Player, Coach, Staff } from "./types";
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

export async function requestDataUpdateAction({
  clubId,
  memberId,
  memberType,
}: {
  clubId: string;
  memberId: string;
  memberType: 'player' | 'coach' | 'staff';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const collectionName = memberType === 'player' ? 'players' : memberType === 'coach' ? 'coaches' : 'staff';
    const memberRef = doc(db, "clubs", clubId, collectionName, memberId);

    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
      return { success: false, error: "No se encontró al miembro." };
    }

    await updateDoc(memberRef, {
      updateRequestActive: true,
    });

    const memberData = memberSnap.data() as Player | Coach | Staff;
    
    let contactEmail = '';
    if ('tutorEmail' in memberData && memberData.tutorEmail) {
        contactEmail = memberData.tutorEmail;
    } else if ('email' in memberData && memberData.email) {
        contactEmail = memberData.email;
    }

    if (!contactEmail) {
       await updateDoc(memberRef, { updateRequestActive: false }); // Rollback
       return { success: false, error: "El miembro no tiene un correo electrónico de contacto." };
    }

    const updateUrl = `${window.location.origin}/update-profile/${memberId}?type=${memberType}`;

    const emailResult = await sendEmailWithSmtpAction({
      clubId,
      recipients: [{ email: contactEmail, name: memberData.name }],
      subject: `Actualiza tus datos en ${clubId}`, // A better club name would be good
      htmlContent: `
        <h1>Actualización de Datos</h1>
        <p>Hola ${memberData.name},</p>
        <p>Por favor, ayúdanos a mantener tu información actualizada. Haz clic en el siguiente enlace para revisar y corregir tus datos:</p>
        <a href="${updateUrl}">Actualizar mis datos</a>
        <p>Este enlace es válido solo para ti y caducará una vez lo utilices.</p>
        <p>Gracias,</p>
        <p>El equipo de ${clubId}</p>
      `,
    });

    if (!emailResult.success) {
      await updateDoc(memberRef, { updateRequestActive: false }); // Rollback
      return { success: false, error: `Error al enviar el correo: ${emailResult.error}` };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error requesting data update:", error);
    return { success: false, error: error.message };
  }
}
