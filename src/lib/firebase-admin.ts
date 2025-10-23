
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';


// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try { 
 
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: "sportspanel.appspot.com",
    });
    
    console.log("✅ Firebase Admin initialized successfully");
  } catch (e) {
    console.error("❌ Firebase Admin initialization error:", e);
  }
} 


const db = getFirestore();
const auth = getAuth();
const storage = getStorage(); 

export { admin, db, auth, storage }; 