
"use server";

import { generateCommunicationTemplate, GenerateCommunicationTemplateInput } from "@/ai/flows/generate-communication-template";
import { processEmailBatchFlow } from "@/ai/flows/process-email-batch";
import { doc, getDoc, updateDoc, collection, query, where, limit, getDocs, writeBatch, Timestamp, collectionGroup } from "firebase/firestore";
import { db as clientDb } from "./firebase";
import { db as adminDb } from "./firebase-admin";


export async function generateTemplateAction(input: GenerateCommunicationTemplateInput) {
  try {
    const result = await generateCommunicationTemplate(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: "No se pudo generar la plantilla. Por favor, inténtalo de nuevo." };
  }
}

type VerificationInput = {
    email: string;
    clubId: string;
}

export async function initiateSenderVerificationAction(input: VerificationInput) {
    
    const settingsRef = doc(clientDb, "clubs", input.clubId, "settings", "config");
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
                nickname: input.email.split('@')[0], // A friendly name for the sender
                from_email: input.email,
                from_name: 'SportsPanel Sender', // This can be customized
                reply_to: input.email,
                address: '123 Main Street', // Dummy data required by SendGrid
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
    const settingsRef = doc(clientDb, "clubs", input.clubId, "settings", "config");
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

// Server actions for email batch processing using Admin SDK
export async function getBatchToProcess({ batchId }: { batchId?: string }) {
    try {
        let batchDoc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot | undefined;

        if (batchId) {
             const batchQuery = adminDb.collectionGroup('emailBatches').where('__name__', '==', `clubs/${batchId.split('/')[1]}/emailBatches/${batchId.split('/')[3]}`);
             const snapshot = await batchQuery.get();
             if (!snapshot.empty) {
                batchDoc = snapshot.docs[0];
             }
        } else {
            const batchQuery = adminDb.collectionGroup('emailBatches').where('status', '==', 'pending').limit(1);
            const batchSnapshot = await batchQuery.get();
            if (!batchSnapshot.empty) {
                batchDoc = batchSnapshot.docs[0];
            }
        }

        if (!batchDoc || !batchDoc.exists) {
            return { success: true, batch: null, error: "No pending batch found." };
        }

        const batchData = batchDoc.data();
        const clubId = batchDoc.ref.parent.parent?.id;

        if (!clubId) {
            await batchDoc.ref.update({ status: 'failed', error: 'Could not determine club ID.' });
            return { success: false, error: 'Could not determine club ID for a batch.' };
        }

        await batchDoc.ref.update({ status: 'processing' });
        
        return { success: true, batch: batchData, clubId, batchDocPath: batchDoc.ref.path };
    } catch (error: any) {
        console.error("Error in getBatchToProcess:", error);
        return { success: false, error: error.message };
    }
}

export async function getClubConfig({ clubId }: { clubId: string }) {
    try {
        const settingsRef = adminDb.collection('clubs').doc(clubId).collection('settings').doc('config');
        const clubRef = adminDb.collection('clubs').doc(clubId);

        const [settingsDoc, clubDoc] = await Promise.all([settingsRef.get(), clubRef.get()]);
        
        let config = {
          clubName: "Tu Club",
          fromEmail: `notifications@${process.env.FIREBASE_PROJECT_ID || 'sportspanel'}.web.app`,
          apiKey: null as string | null,
        };
        
        if(clubDoc.exists) {
            config.clubName = clubDoc.data()?.name || "Tu Club";
        }

        if (settingsDoc.exists) {
            const data = settingsDoc.data();
            if (data?.fromEmail && data?.senderVerificationStatus === 'verified') {
                config.fromEmail = data.fromEmail;
            }
            if (data?.platformSendgridApiKey) {
                config.apiKey = data.platformSendgridApiKey;
            }
        }
        
        if (!config.apiKey) {
            return { success: false, error: "La API Key de SendGrid para la plataforma no está configurada." };
        }

        return { success: true, config };
    } catch (error: any) {
        console.error("Error in getClubConfig:", error);
        return { success: false, error: error.message };
    }
}

export async function updateBatchWithResults({ batchDocPath, results, originalRecipients }: { batchDocPath: string, results: any[], originalRecipients: any[] }) {
    try {
        const batchRef = adminDb.doc(batchDocPath);
        const updatedRecipients = [...originalRecipients];

        results.forEach(result => {
            const index = updatedRecipients.findIndex(r => r.id === result.id);
            if (index !== -1) {
                updatedRecipients[index].status = result.status;
                if (result.status === 'failed') {
                    updatedRecipients[index].error = result.error;
                }
            }
        });

        const allProcessed = updatedRecipients.every(r => r.status === 'sent' || r.status === 'failed');
        const newStatus = allProcessed ? 'completed' : 'pending'; // Revert to pending if not all done

        await batchRef.update({ recipients: updatedRecipients, status: newStatus });

        return { success: true };
    } catch (error: any) {
        console.error("Error in updateBatchWithResults:", error);
        return { success: false, error: error.message };
    }
}

export async function finalizeBatch({ batchDocPath, status, error }: { batchDocPath: string, status: 'completed' | 'failed', error?: string }) {
     try {
        const batchRef = adminDb.doc(batchDocPath);
        const updateData: { status: string, error?: string } = { status };
        if (error) {
            updateData.error = error;
        }
        await batchRef.update(updateData);
        return { success: true };
    } catch (error: any) {
        console.error("Error in finalizeBatch:", error);
        return { success: false, error: error.message };
    }
}

type TokenData = {
    clubId: string;
    recipient: any;
    fieldConfig: any;
    token: string;
}

export async function createDataUpdateTokens({ tokensToCreate }: { tokensToCreate: TokenData[] }) {
    try {
        const tokenBatch = adminDb.batch();
        for (const tokenData of tokensToCreate) {
            const { clubId, recipient, fieldConfig, token } = tokenData;
            const tokenRef = adminDb.collection('dataUpdateTokens').doc(token);
            tokenBatch.set(tokenRef, {
                clubId: clubId,
                memberId: recipient.id,
                memberType: recipient.type,
                fieldConfig: fieldConfig || {},
                expires: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });
        }
        await tokenBatch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error creating data update tokens:", error);
        return { success: false, error: error.message };
    }
}

export async function retryBatchAction({ clubId, batchId }: { clubId: string, batchId: string }) {
    try {
        const batchRef = doc(clientDb, "clubs", clubId, "emailBatches", batchId);
        await updateDoc(batchRef, {
            status: "pending"
        });
        
        await processEmailBatchFlow({ batchId: batchRef.path });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error retrying batch:", error);
        return { success: false, error: "No se pudo reintentar el lote." };
    }
}
