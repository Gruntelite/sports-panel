
'use server';

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from 'firebase-admin/auth';
import { getApp } from "firebase-admin/app";
import { getFunctions } from "firebase-admin/functions";
import { db, auth as adminAuth } from './firebase-admin'; // Use Admin SDK
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

export async function createClubAction(data: { clubName: string, adminName: string, sport: string, email: string, password: string, themeColor: string }): Promise<{success: boolean, error?: string, sessionId?: string}> {
  let uid: string;
  try {
    // Step 1: Create the Firebase Auth user first
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.adminName,
    });
    uid = userRecord.uid;

    // Step 2: Create the club document to get a clubId
    const clubRef = db.collection("clubs").doc();
    const clubId = clubRef.id;
    
    await clubRef.set({
      name: data.clubName,
      sport: data.sport,
      adminUid: uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Step 3: Create the user document in the 'users' collection
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.set({
        clubId: clubId,
        email: data.email,
        name: data.adminName,
        role: 'super-admin'
    });
    
    // Step 4: Create the club settings document
    const luminance = getLuminance(data.themeColor);
    const foregroundColor = luminance > 0.5 ? '#000000' : '#ffffff';
    const settingsRef = db.collection("clubs").doc(clubId).collection("settings").doc("config");
    await settingsRef.set({
        themeColor: data.themeColor,
        themeColorForeground: foregroundColor,
        logoUrl: null
    }, { merge: true });

    // Step 5: Create the checkout session document in the user's subcollection
    const checkoutSessionsRef = userDocRef.collection('checkout_sessions');
    const checkoutDocRef = await checkoutSessionsRef.add({
      price: "price_1S0TMLPXxsPnWGkZFXrjSAaw",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/register?subscription=cancelled`,
      trial_period_days: 20,
      allow_promotion_codes: true,
      mode: 'subscription',
    });

    // Step 6: Wait for the extension to write the sessionId
    const sessionId = await new Promise<string>((resolve, reject) => {
      const unsubscribe = checkoutDocRef.onSnapshot((snap) => {
        const { error, sessionId } = snap.data() as {
          error?: { message: string };
          sessionId?: string;
        };
        if (error) {
          unsubscribe();
          reject(new Error(error.message));
        }
        if (sessionId) {
          unsubscribe();
          resolve(sessionId);
        }
      });
    });

    return { success: true, sessionId };

  } catch (error: any) {
    console.error("Error creating club and checkout session:", error);
    let errorMessage = "Ocurrió un error inesperado al iniciar el registro.";
     if (error.code === 'auth/email-already-exists') {
        errorMessage = "Este correo electrónico ya está en uso. Por favor, utiliza otro o inicia sesión.";
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
    const batch = db.batch();
    
    members.forEach(member => {
        const memberRef = db.collection("clubs").doc(clubId).collection(collectionName).doc(member.id);
        batch.update(memberRef, { updateRequestActive: true });
    });
    
    await batch.commit();

    const fieldsQueryParam = fields.join(',');

    const emailRecipients = members.map(m => ({ email: m.email, name: m.name }));
    let emailsSent = 0;
    
    const clubDocRef = db.collection("clubs").doc(clubId);
    const clubDocSnap = await clubDocRef.get();
    const clubName = clubDocSnap.exists ? clubDocSnap.data()!.name : 'Tu Club';

    for (const recipient of emailRecipients) {
        if (!recipient.email) continue;
        
        const memberId = members.find(m => m.email === recipient.email)?.id;
        if (!memberId) continue;

        const updateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/update-profile/${memberId}?type=${memberType}&clubId=${clubId}&fields=${fieldsQueryParam}`;
        
        const formData = new FormData();
        formData.append('clubId', clubId);
        formData.append('recipients', JSON.stringify([recipient]));
        formData.append('subject', `Actualiza tus datos en ${clubName}`);
        formData.append('htmlContent', `
            <h1>Actualización de Datos</h1>
            <p>Hola ${recipient.name},</p>
            <p>Por favor, ayúdanos a mantener tu información actualizada. Haz clic en el siguiente enlace para revisar y corregir los datos solicitados:</p>
            <a href="${updateUrl}">Actualizar mis datos</a>
            <p>Este enlace es de un solo uso.</p>
            <p>Gracias,</p>
            <p>El equipo de ${clubName}</p>
        `);


        const emailResult = await sendEmailWithSmtpAction(formData);

        if (emailResult.success) {
            emailsSent++;
        } else {
            console.warn(`Failed to send email to ${recipient.email}: ${emailResult.error}`);
            const memberRef = db.collection("clubs").doc(clubId).collection(collectionName).doc(memberId);
            await memberRef.update({ updateRequestActive: false });
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
        const batch = db.batch();
        const collectionName = importerType;
        const collectionRef = db.collection("clubs").doc(clubId).collection(collectionName);

        let teams: { id: string, name: string }[] = [];
        if (collectionName === 'players' || collectionName === 'coaches') {
            const teamsSnapshot = await db.collection("clubs").doc(clubId).collection("teams").get();
            teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        }

        data.forEach(item => {
            const docRef = collectionRef.doc();
            
            if ((collectionName === 'players' || collectionName === 'coaches') && item.teamName) {
                const team = teams.find(t => t.name.toLowerCase() === item.teamName.toLowerCase());
                if (team) {
                    item.teamId = team.id;
                }
            }

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

export async function requestFilesAction(formData: FormData): Promise<{ success: boolean; error?: string; count?: number }> {
  const clubId = formData.get('clubId') as string;
  const members = JSON.parse(formData.get('members') as string) as { id: string; name: string; email: string; type: 'Jugador' | 'Entrenador' | 'Staff' }[];
  const documentTitle = formData.get('doc-title') as string;
  const message = formData.get('message') as string;
  const attachment = formData.get('attachment') as File;

  if (members.length === 0) {
    return { success: false, error: "No se seleccionaron miembros." };
  }

  try {
    const batch = db.batch();
    const batchRef = db.collection('fileRequestBatches').doc();
    
    batch.set(batchRef, {
      clubId,
      documentTitle,
      totalSent: members.filter(m => m.email).length,
      createdAt: FieldValue.serverTimestamp()
    });

    const requestsToSend: { recipient: {email: string, name: string}, url: string }[] = [];

    for (const member of members) {
      if (!member.email) continue;
      
      const requestRef = db.collection("fileRequests").doc();
      const token = requestRef.id;
      const userType = member.type === 'Jugador' ? 'players' : member.type === 'Entrenador' ? 'coaches' : 'staff';

      batch.set(requestRef, {
        clubId,
        batchId: batchRef.id,
        userId: member.id,
        userType: userType,
        userName: member.name,
        documentTitle,
        message,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      });
      
      requestsToSend.push({
        recipient: { email: member.email, name: member.name },
        url: `${process.env.NEXT_PUBLIC_APP_URL}/upload/${token}`,
      });
    }

    await batch.commit();

    const clubDocRef = db.collection("clubs").doc(clubId);
    const clubDocSnap = await clubDocRef.get();
    const clubName = clubDocSnap.exists ? clubDocSnap.data()!.name : 'Tu Club';
    let emailsSent = 0;

    for (const request of requestsToSend) {
        const emailFormData = new FormData();
        emailFormData.append('clubId', clubId);
        emailFormData.append('recipients', JSON.stringify([request.recipient]));
        emailFormData.append('subject', `Solicitud de archivo: ${documentTitle}`);
        emailFormData.append('htmlContent', `
            <h1>Solicitud de Archivo</h1>
            <p>Hola ${request.recipient.name},</p>
            <p>El club ${clubName} te solicita que subas el siguiente documento: <strong>${documentTitle}</strong>.</p>
            ${message ? `<p><strong>Mensaje del club:</strong> ${message}</p>` : ''}
            <p>Por favor, utiliza el siguiente enlace seguro para subir tu archivo:</p>
            <a href="${request.url}">Subir Archivo</a>
            <p>Gracias,</p>
            <p>El equipo de ${clubName}</p>
        `);
        
        if (attachment && attachment.size > 0) {
            emailFormData.append('attachments', attachment);
        }

      const emailResult = await sendEmailWithSmtpAction(emailFormData);
      if(emailResult.success) emailsSent++;
    }
    
    return { success: true, count: emailsSent };
  } catch (error: any) {
    console.error("Error requesting files:", error);
    return { success: false, error: error.message };
  }
}

export async function createPortalLinkAction(): Promise<string> {
    const app = getApp();
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const userDocRef = db.collection("users").doc(user.uid);
    const userDocSnap = await userDocRef.get();
    if (!userDocSnap.exists) throw new Error("User document not found.");

    const customerId = userDocSnap.data()!.stripeId;
    if (!customerId) throw new Error("Stripe Customer ID not found.");
    
    const functions = getFunctions(getApp());
    const createPortalLink = functions.httpsCallable('ext-firestore-stripe-payments-createPortalLink');

    const { data } = await createPortalLink({
        customerId: customerId,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/club-settings`,
    });

    return (data as any).url;
}
