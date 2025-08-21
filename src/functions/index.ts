
import { onObjectDeleted } from 'firebase-functions/v2/storage';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore();

// This function triggers when a file is deleted from Firebase Storage.
export const onFileDelete = onObjectDeleted(async (event) => {
  const filePath = event.data.name;

  // We only care about files in the club-documents path.
  if (!filePath.startsWith('club-documents/')) {
    console.log(`File path ${filePath} is not a club document, skipping.`);
    return;
  }

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
