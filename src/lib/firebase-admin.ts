
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (error: any) {
        // In some environments (like client-side builds where this might be imported),
        // initializeApp can fail if credentials aren't set. We can ignore this
        // error here as the Admin SDK should only be used in server-side contexts
        // where it's properly configured.
        if (error.code !== 'app/duplicate-app') {
            console.log('Admin SDK init failed (expected on client):', error.message);
        }
    }
}

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

try {
    db = admin.firestore();
    auth = admin.auth();
} catch (error) {
    console.log("Could not initialize admin db/auth. This is expected on the client-side.");
}


export { db, auth };
