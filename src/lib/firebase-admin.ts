
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
    // for authentication on the server.
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: "sportspanel.firebasestorage.app",
    });
  } catch (e) {
    console.error('Firebase admin initialization error', e);
  }
}

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

export { db, auth, storage };
