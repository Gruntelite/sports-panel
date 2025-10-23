
'use server';

import { auth as adminAuth, db as adminDb } from './firebase-admin';
import { Timestamp } from "firebase-admin/firestore";
import type { ClubCreationData, ClubMember } from "./types";
import { sendEmailWithSmtpAction } from "./email";
import { createHmac }from 'crypto';
import { addDays, parse } from "date-fns";
import Stripe from 'stripe';
import 'dotenv/config';


export async function createClubAction(values: ClubCreationData): Promise<{ success: boolean; error?: string; userId?: string }> {
    const { clubName, adminName, sport, email, password, defaultLanguage } = values;
    
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
        
        const trialEndDate = addDays(new Date(), 10);

        const settingsRef = adminDb.collection("clubs").doc(clubId).collection("settings").doc("config");
        batch.set(settingsRef, {
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


export async function requestDataUpdateAction(payload: { clubId: string; members: any[]; memberType: 'player' | 'coach'; fields: string[] }) {
  const { clubId, members, memberType, fields } = payload;

  if (members.length === 0) {
    return { success: false, error: "No se seleccionaron miembros." };
  }
  if (!fields || fields.length === 0) {
    return { success: false, error: "No se seleccionaron campos para actualizar."};
  }

  try {
    const clubDocRef = adminDb.collection("clubs").doc(clubId);
    const clubDocSnap = await clubDocRef.get();
    if (!clubDocSnap.exists) {
        return { success: false, error: "El club especificado no existe." };
    }
    const clubName = clubDocSnap.data()!.name || 'Tu Club';
    
    let emailsSent = 0;
    
    const batch = adminDb.batch();

    for (const member of members) {
        if (!member.email) continue;
        
        const updateUrl = `https://sportspanel.net/update-profile/${member.id}?type=${memberType}&clubId=${clubId}&fields=${fields.join(',')}`;
        
        const collectionName = memberType === 'player' ? 'players' : 'coaches';
        const memberRef = adminDb.collection("clubs").doc(clubId).collection(collectionName).doc(member.id);
        batch.update(memberRef, { updateRequestActive: true });


        const emailResult = await sendEmailWithSmtpAction({
            clubId,
            recipients: [{ email: member.email, name: member.name }],
            subject: `Actualización de datos para ${clubName}`,
            htmlContent: `
                <h1>Actualización de Datos</h1>
                <p>Hola ${member.name},</p>
                <p>El club ${clubName} solicita que actualices tu información. Por favor, haz clic en el siguiente enlace para revisar y confirmar tus datos. El enlace es de un solo uso y expirará una vez que hayas guardado los cambios.</p>
                <a href="${updateUrl}">Actualizar mis datos</a>
                <p>Gracias,</p>
                <p>El equipo de ${clubName}</p>
            `,
        });
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
            let processedItem: { [key: string]: any } = {};

            if ((collectionName === 'players' || collectionName === 'coaches') && item.teamName) {
                const team = teams.find(t => t.name.toLowerCase() === item.teamName.toLowerCase());
                if (team) {
                    item.teamId = team.id;
                }
            }

            for (const key in item) {
                const value = item[key];
                if (value === null || value === undefined || value === '') continue;

                if (key.toLowerCase().includes('date') && typeof value === 'string') {
                    // Try to parse date, if invalid, leave it out
                    const parsedDate = parse(value, 'yyyy-MM-dd', new Date());
                    if (!isNaN(parsedDate.getTime())) {
                        processedItem[key] = value;
                    }
                } else if (key === 'annualFee' && value !== null) {
                    const fee = Number(String(value).replace(/,/g, '.'));
                    if(!isNaN(fee)) {
                        processedItem[key] = fee;
                    }
                } else if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
                    processedItem[key] = value.toLowerCase() === 'true';
                } else {
                    processedItem[key] = value;
                }
            }
            
            batch.set(docRef, processedItem);
        });

        await batch.commit();

        return { success: true, count: data.length };

    } catch (error: any) {
        console.error(`Error importing ${importerType}:`, error);
        return { success: false, error: `Ocurrió un error durante la importación: ${error.message}` };
    }
}

export async function requestFilesAction(formData: FormData) {
  const clubId = formData.get('clubId') as string;
  const members = JSON.parse(formData.get('members') as string) as ClubMember[];
  const documentTitles = JSON.parse(formData.get('documents') as string) as string[];
  const subject = formData.get('subject') as string | undefined;
  const customMessage = formData.get('message') as string | undefined;
  const attachment = formData.get('attachment') as File | undefined;
  
  if (members.length === 0) return { success: false, error: "No se seleccionaron miembros." };
  if (documentTitles.length === 0) return { success: false, error: "No se seleccionaron documentos para solicitar." };

  try {
    const clubDocRef = adminDb.collection("clubs").doc(clubId);
    const clubDocSnap = await clubDocRef.get();
    if (!clubDocSnap.exists) {
        return { success: false, error: "El club especificado no existe." };
    }
    const clubName = clubDocSnap.data()!.name || 'Tu Club';

    let emailsSent = 0;
    const batch = adminDb.batch();
    
    const batchId = adminDb.collection("fileRequestBatches").doc().id;
     batch.set(adminDb.collection("fileRequestBatches").doc(batchId), {
        clubId,
        documentTitle: documentTitles.join(', '),
        totalSent: members.length * documentTitles.length,
        createdAt: Timestamp.now(),
    });


    for (const member of members) {
      if (!member.email) continue;
      
      const singleUseToken = createHmac('sha256', process.env.TOKEN_SECRET || 'fallback-secret')
                            .update(member.id + Date.now().toString())
                            .digest('hex');

      for (const docTitle of documentTitles) {
          const requestRef = adminDb.collection("fileRequests").doc();
          batch.set(requestRef, {
            clubId,
            batchId,
            userId: member.id,
            userName: member.name,
            documentTitle: docTitle,
            status: 'pending',
            createdAt: Timestamp.now(),
            token: singleUseToken
          });
      }
      
      const appUrl = `https://sportspanel.net`;
      const uploadUrl = `${appUrl}/upload/${singleUseToken}`;

      const finalSubject = subject || `Solicitud de Documentación - ${clubName}`;
      const finalMessage = customMessage ? `<p>${customMessage.replace(/\n/g, '<br>')}</p>` : `<p>El club ${clubName} solicita que adjuntes la siguiente documentación: <strong>${documentTitles.join(', ')}</strong>.</p>`;

      const emailResult = await sendEmailWithSmtpAction({
        clubId,
        recipients: [{ email: member.email, name: member.name }],
        subject: finalSubject,
        htmlContent: `
            <h1>Solicitud de Documentación</h1>
            <p>Hola ${member.name},</p>
            ${finalMessage}
            <p>Por favor, utiliza el siguiente enlace para subir los archivos de forma segura. El enlace es de un solo uso.</p>
            <a href="${uploadUrl}">Subir Documentación</a>
            <p>Gracias,</p>
            <p>El equipo de ${clubName}</p>
        `,
        attachments: attachment ? [attachment] : []
      });

      if (emailResult.success) {
        emailsSent++;
      } else {
        console.warn(`Failed to send email to ${member.email}: ${emailResult.error}`);
      }
    }

    await batch.commit();
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

export async function createStripeConnectAccountLinkAction({ clubId }: { clubId: string }): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!clubId) {
        return { success: false, error: "Club ID is missing." };
    }

    const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY!, {
        apiVersion: "2024-06-20",
    });

    try {
        const settingsRef = adminDb.collection("clubs").doc(clubId).collection("settings").doc("config");
        const settingsSnap = await settingsRef.get();
        let accountId = settingsSnap.data()?.stripeConnectAccountId;

        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
            });
            accountId = account.id;
            await settingsRef.set({ stripeConnectAccountId: accountId }, { merge: true });
        }

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `https://sportspanel.net/fees?reauth=true&clubId=${clubId}`,
            return_url: `https://sportspanel.net/fees?success=true&clubId=${clubId}`,
            type: 'account_onboarding',
        });

        return { success: true, url: accountLink.url };

    } catch (error: any) {
        console.error("Error creating Stripe Connect account link:", error);
        return { success: false, error: error.message };
    }
}
 
/**
 * Create a Stripe Payment Link for a single club member (player)
 * Stores a transaction doc under clubs/{clubId}/feesTransactions/{id}
 */
export async function createStripePaymentLinkAction({
  clubId,
  memberId,
  amount,
  currency = "eur",
  description,
}: {
  clubId: string;
  memberId: string;
  amount: number; // Euros
  currency?: string;
  description?: string;
}): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!clubId || !memberId || !amount) {
    return { success: false, error: "Incomplete data to generate payment link." };
  }

  try {
    console.log("createStripePaymentLinkAction", clubId, memberId, amount, currency);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

    // 🔹 Get club config (Stripe Account + Commission)
    const configRef = adminDb.collection("clubs").doc(clubId).collection("settings").doc("config");
    const configSnap = await configRef.get();
    const config = configSnap.data();
    const stripeAccountId = config?.stripeConnectAccountId;

    if (!stripeAccountId) {
      return { success: false, error: "Club is not connected to Stripe." };
    }

    // 🔹 Platform commission (in cents)
    const platformCommissionCents = config?.platformCommissionCents ?? 0;

    // 🔹 Player info
    const playerRef = adminDb.collection("clubs").doc(clubId).collection("players").doc(memberId);
    const playerSnap = await playerRef.get();
    const player = playerSnap.exists ? playerSnap.data() : null;
    const playerEmail = player?.email;

    const unitAmountCents = Math.round(amount * 100);

    // 🔹 Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: playerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description || `Club Fee - Member ${memberId}`,
              metadata: { clubId, memberId },
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: stripeAccountId,
        },
        // ✅ Apply platform commission fee
        application_fee_amount: platformCommissionCents,
        metadata: { clubId, memberId },
      },
      allow_promotion_codes: false,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/fees?payment=success&clubId=${clubId}&memberId=${memberId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/fees?payment=cancel&clubId=${clubId}&memberId=${memberId}`,
      metadata: { clubId, memberId },
    });

    // 🔹 Save transaction in Firestore
    const txRef = adminDb.collection("clubs").doc(clubId).collection("feesTransactions").doc();
    await txRef.set({
      clubId,
      memberId,
      amount,
      currency,
      paymentLink: session.url || null,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent || null,
      platformCommissionCents,
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // 🔹 Send email (if player email exists)
    if (playerEmail) {
      await sendEmailWithSmtpAction({
        clubId,
        recipients: [{ email: playerEmail, name: player?.name || "" }],
        subject: "Complete your club fee payment",
        htmlContent: `<p>Hello ${player?.name || ""},</p>
        <p>Click the link below to complete your payment:</p>
        <p><a href="${session.url}">Pay Now</a></p>`,
      });
    }

    return { success: true, url: session.url || undefined };
  } catch (err: any) {
    console.error("createStripePaymentLinkAction error:", err);
    return { success: false, error: err.message || "Error creating payment link." };
  }
}


export async function updateFeesConfigAction({
  clubId,
  billingDay,
  activeMonths,
  commissionPerMonth,
}: {
  clubId: string;
  billingDay: number;
  activeMonths: number[]; // [1..12]
  commissionPerMonth: number; // euros, e.g. 0.24
}): Promise<{ success: boolean; error?: string }> {
  if (!clubId) return { success: false, error: "ClubId faltante." };
  try {
    const cfgRef = adminDb.collection("clubs").doc(clubId).collection("feesConfig").doc("settings");
    await cfgRef.set({
      billingDay,
      activeMonths,
      commissionPerMonth,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error("updateFeesConfigAction error:", err);
    return { success: false, error: err.message || "Error al actualizar configuración de cuotas." };
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

export async function sendReviewAction(reviewData: {
  clubId: string;
  clubName: string;
  userName: string;
  rating: number;
  comment: string;
}): Promise<{ success: boolean; error?: string }> {
  const { clubId, clubName, userName, rating, comment } = reviewData;

  const subject = `Nueva reseña de SportsPanel: ${rating} estrellas de ${clubName}`;
  const htmlContent = `
    <h1>Nueva reseña de SportsPanel</h1>
    <p><strong>Club:</strong> ${clubName}</p>
    <p><strong>Usuario:</strong> ${userName}</p>
    <p><strong>Puntuación:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</p>
    <p><strong>Comentario:</strong></p>
    <p>${comment.replace(/\n/g, '<br>')}</p>
  `;
  
  // We use SportsPanel's own clubId to fetch its SMTP settings to send the email
  const result = await sendEmailWithSmtpAction({
    clubId: "VWxHRR6HzumBnSdLfTtP", 
    recipients: [{ email: "info.sportspanel@gmail.com", name: "Reseñas SportsPanel" }],
    subject,
    htmlContent,
  });

  return result;
}

export async function sendSupportRequestAction(supportData: {
  clubId: string;
  clubName: string;
  userName: string;
  userEmail: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const { clubId, clubName, userName, userEmail, message } = supportData;

  const subject = `Solicitud de Soporte - ${clubName}`;
  const htmlContent = `
    <h1>Nueva Solicitud de Soporte</h1>
    <p><strong>Club:</strong> ${clubId}</p>
    <p><strong>Club:</strong> ${clubName}</p>
    <p><strong>Usuario:</strong> ${userName}</p>
    <p><strong>Email de Contacto:</strong> ${userEmail}</p>
    <hr>
    <p><strong>Mensaje:</strong></p>
    <p>${message.replace(/\n/g, '<br>')}</p>
  `;

  // We use SportsPanel's own clubId to fetch its SMTP settings to send the email
  const result = await sendEmailWithSmtpAction({
    clubId: "VWxHRR6HzumBnSdLfTtP", 
    recipients: [{ email: "info.sportspanel@gmail.com", name: "Soporte SportsPanel" }],
    subject,
    htmlContent,
  });

  return result;
}
