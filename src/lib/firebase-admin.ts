
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
    // for authentication on the server.
    admin.initializeApp({
        storageBucket: "sportspanel.firebasestorage.app",
    });
  } catch (e) {
    console.error('Firebase admin initialization error', e);
  }
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

export { db, auth, storage };

