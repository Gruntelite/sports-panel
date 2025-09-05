import { onObjectDeleted } from 'firebase-functions/v2/storage';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { createHmac }from 'crypto';


if (admin.apps.length === 0) {
  admin.initializeApp({
    storageBucket: "sportspanel.firebasestorage.app",
  });
}

const db = getFirestore();
const auth = admin.auth();

function getLuminance(hex: string): number {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export const createClub = onCall(async (request) => {
    const { clubName, adminName, sport, email, password, themeColor, eventId, eventSourceUrl, clientUserAgent } = request.data;
    
    try {
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: adminName,
        });
        const uid = userRecord.uid;

        const batch = db.batch();

        const clubRef = db.collection("clubs").doc();
        const clubId = clubRef.id;
        batch.set(clubRef, {
            name: clubName,
            sport: sport,
            adminUid: uid,
            createdAt: Timestamp.now(),
        });

        const userDocRef = db.collection('users').doc(uid);
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

        const settingsRef = db.collection("clubs").doc(clubId).collection("settings").doc("config");
        batch.set(settingsRef, {
            themeColor: themeColor,
            themeColorForeground: foregroundColor,
            logoUrl: null,
            trialEndDate: Timestamp.fromDate(trialEndDate),
        }, { merge: true });

        await batch.commit();
        
        return { success: true, userId: uid };
    } catch (error: any) {
        console.error("Error in createClub function:", error);
        let errorMessage = "Ocurrió un error inesperado al crear el club.";
        if (error.code === 'auth/email-already-exists') {
            errorMessage = "Este correo electrónico ya está en uso. Por favor, utiliza otro o inicia sesión.";
        }
        return { success: false, error: errorMessage };
    }
});


// This function triggers when a file is deleted from Firebase Storage.
export const onFileDelete = onObjectDeleted(async (event) => {
  const filePath = event.data.name;

  console.log(`File ${filePath} has been deleted. Searching for matching document in Firestore.`);

  try {
    const querySnapshot = await db.collectionGroup('documents').where('path', '==', filePath).get();

    if (querySnapshot.empty) {
      console.log(`No Firestore document found with path: ${filePath}`);
      return;
    }
    
    const batch = db.batch();
    querySnapshot.forEach(doc => {
      console.log(`Found and preparing to delete document: ${doc.ref.path}`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Successfully deleted ${querySnapshot.size} Firestore document(s) corresponding to ${filePath}.`);

  } catch (error) {
    console.error(`Error deleting Firestore document for path ${filePath}:`, error);
  }
});
