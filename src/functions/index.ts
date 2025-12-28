
import { onObjectDeleted } from 'firebase-functions/v2/storage';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createHmac }from 'crypto';
import { checkAndUpdateSubscriptions } from './fees/scheduled-subscription-check';


if (admin.apps.length === 0) {
  admin.initializeApp({
    storageBucket: "sportspanel.firebasestorage.app",
  });
}

const db = getFirestore();


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

// Scheduled function to check and update subscriptions based on configured charge months
// Runs on the 1st of every month at 00:00 UTC
export const monthlySubscriptionCheck = onSchedule({
  schedule: '0 0 1 * *', // Cron format: At 00:00 on day-of-month 1
  timeZone: 'Europe/Madrid',
}, async (event) => {
  console.log('Starting monthly subscription check...');
  try {
    await checkAndUpdateSubscriptions();
    console.log('Monthly subscription check completed successfully');
  } catch (error) {
    console.error('Error in monthly subscription check:', error);
  }
});
