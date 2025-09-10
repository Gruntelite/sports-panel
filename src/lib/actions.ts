
'use server';

import { Timestamp } from "firebase-admin/firestore";
import { auth as adminAuth, db as adminDb } from './firebase-admin';
import type { ClubCreationData } from "./types";
import { sendEmailWithSmtpAction } from "./email";
import { createHmac }from 'crypto';

function getLuminance(hex: string): number {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export async function createClubAction(values: ClubCreationData): Promise<{ success: boolean; error?: string; userId?: string }> {
    const { clubName, adminName, sport, email, password, themeColor, defaultLanguage } = values;
    
    try {
        const userRecord = await adminAuth.createUser({
            email: email,
            password: password,
            displayName: adminName,
        });
        const uid = userRecord.uid;

        const batch = adminDb.batch();

        const clubRef = adminDb.collection("clubs").doc();
        const clubId = clubRef.id;
        
        batch.set(clubRef, {
            name: clubName,
            sport: sport,
            adminUid: uid,
            createdAt: Timestamp.now(),
        });

        const userDocRef = adminDb.collection('users').doc(uid);
        batch.set(userDocRef, {
            email: email,
            name: adminName,
            role: 'super-admin',
            clubId: clubId,
        });
        
        const luminance = getLuminance(themeColor);
        const foregroundColor = luminance > 0.5 ? '#000000' : '#ffffff';
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 20);
        trialEndDate.setHours(23, 59, 59, 999);

        const settingsRef = adminDb.collection("clubs").doc(clubId).collection("settings").doc("config");
        batch.set(settingsRef, {
            themeColor: themeColor,
            themeColorForeground: foregroundColor,
            logoUrl: null,
            trialEndDate: Timestamp.fromDate(trialEndDate),
            defaultLanguage: defaultLanguage || 'es',
        }, { merge: true });

        await batch.commit();
        
        return { success: true, userId: uid };
        
    } catch (error: any) {
        console.error("Error in createClubAction:", error);
        let errorMessage = "Ocurrió un error inesperado al crear el club.";
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
  if (fields.length === 0) {
    return { success: false, error: "No se seleccionaron campos para actualizar."};
  }

  try {
    const clubDocRef = adminDb.collection("clubs").doc(clubId);
    const clubDocSnap = await clubDocRef.get();
    const clubName = clubDocSnap.exists ? clubDocSnap.data()!.name : 'Tu Club';
    
    let emailsSent = 0;
    
    const batch = adminDb.batch();

    for (const member of members) {
        if (!member.email) continue;
        
        const fieldsQueryParam = fields.join(',');
        const appUrl = `https://sportspanel.net`;
        const updateUrl = `${appUrl}/update-profile/${member.id}?type=${memberType}&clubId=${clubId}&fields=${fieldsQueryParam}`;
        
        const collectionName = memberType === 'player' ? 'players' : 'coaches';
        const memberRef = adminDb.collection("clubs").doc(clubId).collection(collectionName).doc(member.id);
        batch.update(memberRef, { updateRequestActive: true });


        const emailPayload = {
            clubId,
            recipients: [{ email: member.email, name: member.name }],
            subject: `Actualiza tus datos en ${clubName}`,
            htmlContent: `
                <h1>Actualización de Datos</h1>
                <p>Hola ${member.name},</p>
                <p>Por favor, ayúdanos a mantener tu información actualizada. Haz clic en el siguiente enlace para revisar y corregir los datos solicitados:</p>
                <a href="${updateUrl}">Actualizar mis datos</a>
                <p>Este enlace es de un solo uso.</p>
                <p>Gracias,</p>
                <p>El equipo de ${clubName}</p>
            `,
        };

        const emailResult = await sendEmailWithSmtpAction(emailPayload);
        if (emailResult.success) {
            emailsSent++;
        } else {
            console.warn(`Failed to send email to ${member.email}: ${emailResult.error}`);
        }
    }
    
    await batch.commit();

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
        const batch = adminDb.batch();
        const collectionName = importerType;
        const collectionRef = adminDb.collection("clubs").doc(clubId).collection(collectionName);

        let teams: { id: string, name: string }[] = [];
        if (collectionName === 'players' || collectionName === 'coaches') {
            const teamsSnapshot = await adminDb.collection("clubs").doc(clubId).collection("teams").get();
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
    const batch = adminDb.batch();
    const batchRef = adminDb.collection('fileRequestBatches').doc();
    
    batch.set(batchRef, {
      clubId,
      documentTitle,
      totalSent: members.filter(m => m.email).length,
      createdAt: Timestamp.now()
    });

    const requestsToSend: { recipient: {email: string, name: string}, url: string }[] = [];

    for (const member of members) {
      if (!member.email) continue;
      
      const requestRef = adminDb.collection("fileRequests").doc();
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
        createdAt: Timestamp.now(),
      });
      
      const appUrl = `https://sportspanel.net`;
      requestsToSend.push({
        recipient: { email: member.email, name: member.name },
        url: `${appUrl}/upload/${token}`,
      });
    }

    await batch.commit();

    const clubDocRef = adminDb.collection("clubs").doc(clubId);
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

      const emailResult = await sendEmailWithSmtpAction({clubId, recipients: [request.recipient], subject: `Solicitud de archivo: ${documentTitle}`, htmlContent: `
            <h1>Solicitud de Archivo</h1>
            <p>Hola ${request.recipient.name},</p>
            <p>El club ${clubName} te solicita que subas el siguiente documento: <strong>${documentTitle}</strong>.</p>
            ${message ? `<p><strong>Mensaje del club:</strong> ${message}</p>` : ''}
            <p>Por favor, utiliza el siguiente enlace seguro para subir tu archivo:</p>
            <a href="${request.url}">Subir Archivo</a>
            <p>Gracias,</p>
            <p>El equipo de ${clubName}</p>
        `, attachments: attachment && attachment.size > 0 ? [attachment] : []});
      if(emailResult.success) emailsSent++;
    }
    
    return { success: true, count: emailsSent };
  } catch (error: any) {
    console.error("Error requesting files:", error);
    return { success: false, error: error.message };
  }
}

export async function createStripeCheckoutAction(uid: string): Promise<{ sessionId?: string; error?: string }> {
  if (!uid) {
    return { error: 'User not authenticated.' };
  }

  try {
    const checkoutSessionRef = adminDb.collection('users').doc(uid).collection('checkout_sessions').doc();
    const appUrl = "https://sportspanel.net";
    
    await checkoutSessionRef.set({
        price: "price_1S0TMLPXxsPnWGkZFXrjSAaw",
        success_url: `${appUrl}/dashboard?subscription=success`,
        cancel_url: `${appUrl}/dashboard?subscription=cancelled`,
        allow_promotion_codes: true,
        mode: 'subscription',
    });

    return { sessionId: checkoutSessionRef.id };
  } catch (error: any) {
    console.error("Error creating Stripe checkout session:", error);
    return { error: error.message };
  }
}

// Meta Conversions API Action
export async function sendServerEventAction(eventData: { 
    eventName: string; 
    email: string;
    name?: string; 
    eventId?: string;
    eventSourceUrl?: string;
    clientUserAgent?: string;
}) {
  const { eventName, email, name, eventId, eventSourceUrl, clientUserAgent } = eventData;

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const apiVersion = 'v20.0';

  if (!pixelId || !accessToken) {
    console.log('Meta Pixel ID or Access Token is not configured. Skipping event.');
    return { success: true, message: 'Skipped Meta event: Configuration missing.' };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${accessToken}`;
  const eventTime = Math.floor(new Date().getTime() / 1000);

  // Helper to hash strings
  const hash = (str: string) => createHmac('sha256', '').update(str.toLowerCase()).digest('hex');
  
  const nameParts = name?.split(' ') || [];
  const firstName = nameParts.length > 0 ? nameParts[0] : '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';


  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        action_source: 'website',
        event_id: eventId,
        event_source_url: eventSourceUrl,
        user_data: {
          em: [hash(email)],
          fn: [hash(firstName)],
          ln: [hash(lastName)],
          client_user_agent: clientUserAgent,
        },
        custom_data: {}
      },
    ],
  };
  
  if (eventName === 'Purchase') {
      payload.data[0].custom_data = {
          currency: 'EUR',
          value: 33.00,
      }
  }


  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Meta API Error:', responseData);
      return { success: false, error: 'Failed to send event to Meta.' };
    }

    console.log('Event sent to Meta successfully:', responseData);
    return { success: true };
  } catch (error) {
    console.error('Error sending server event:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
