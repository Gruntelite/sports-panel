
'use server';

import { doc, getDoc, updateDoc, collection, query, getDocs, writeBatch, Timestamp, setDoc, addDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from './firebase'; // Use client SDK
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
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
        billingPlan: 'pro',
        themeColor: data.themeColor,
        themeColorForeground: foregroundColor
    });

    await batch.commit();
    
    // Now that club is created, log in to create the checkout session
    await signInWithEmailAndPassword(auth, data.email, data.password);

    const priceId = "price_1S0TMLPXxsPnWGkZFXrjSAaw";
    const checkoutSessionsRef = collection(db, 'users', user.uid, 'checkout_sessions');

    const checkoutDocRef = await addDoc(checkoutSessionsRef, {
        price: priceId,
        success_url: `${window.location.origin}/dashboard?subscription=success`,
        cancel_url: `${window.location.origin}/register?subscription=cancelled`,
        trial_period_days: 20,
    });
    
    const sessionId = await new Promise<string>((resolve, reject) => {
        const unsubscribe = onSnapshot(checkoutDocRef, (snap) => {
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
        const collectionName = importerType;
        const collectionRef = collection(db, "clubs", clubId, collectionName);

        let teams: { id: string, name: string }[] = [];
        if (collectionName === 'players' || collectionName === 'coaches') {
            const teamsSnapshot = await getDocs(collection(db, "clubs", clubId, "teams"));
            teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        }

        data.forEach(item => {
            const docRef = doc(collectionRef); // Creates a new document with a random ID
            
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
    const batch = writeBatch(db);
    const batchRef = doc(collection(db, 'fileRequestBatches'));
    
    batch.set(batchRef, {
      clubId,
      documentTitle,
      totalSent: members.filter(m => m.email).length,
      createdAt: Timestamp.now()
    });

    const requestsToSend: { recipient: {email: string, name: string}, url: string }[] = [];

    for (const member of members) {
      if (!member.email) continue;
      
      const requestRef = doc(collection(db, "fileRequests"));
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
      
      requestsToSend.push({
        recipient: { email: member.email, name: member.name },
        url: `${window.location.origin}/upload/${token}`,
      });
    }

    await batch.commit();

    const clubDocRef = doc(db, "clubs", clubId);
    const clubDocSnap = await getDoc(clubDocRef);
    const clubName = clubDocSnap.exists() ? clubDocSnap.data().name : 'Tu Club';
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

export async function createCheckoutSessionAction(data: { priceId: string, formId?: string, submissionId?: string, clubId?: string }) {
    const { priceId, formId, submissionId, clubId } = data;
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        const checkoutSessionsRef = collection(db, 'users', user.uid, 'checkout_sessions');

        const docData: any = {
            price: priceId,
            success_url: formId ? `${window.location.origin}/form/${formId}?subscription=success` : `${window.location.origin}/dashboard?subscription=success`,
            cancel_url: formId ? `${window.location.origin}/form/${formId}?subscription=cancelled` : window.location.origin,
        };

        if (formId) {
            docData.metadata = {
                formId,
                submissionId,
                clubId
            };
        }

        const docRef = await addDoc(checkoutSessionsRef, docData);

        return new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(docRef, (snap) => {
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
    } catch(e) {
        console.log(e);
        throw e;
    }
}


export async function createPortalLinkAction(clubId: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    
    // This is a simplified version. In a real app, you would call a Cloud Function.
    // We simulate this by constructing the URL, but the actual portal link generation
    // happens on Stripe's side and requires a backend call.
    // For this prototype, we'll link to Stripe's billing portal page.
    
    const settingsRef = doc(db, "clubs", clubId, "settings", "config");
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists() && settingsSnap.data().stripeCustomerId) {
         // In a real scenario, this would be a call to a serverless function
        // that uses the Stripe Node.js SDK to create a portal session.
        // const portalSession = await stripe.billingPortal.sessions.create({
        //   customer: customerId,
        //   return_url: `${window.location.origin}/dashboard`,
        // });
        // return portalSession.url;

        // For now, we link to the generic customer portal.
        return `https://billing.stripe.com/p/login/test_7sI5kX5gYg2a8G4eUU`;
    }
    
    throw new Error("Stripe Customer ID not found.");
}
