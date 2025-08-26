
'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { ref } from "firebase/storage";
import { db as adminDb, storage as adminStorage } from './firebase-admin'; // Use Admin SDK
import { v4 as uuidv4 } from "uuid";
import type { FileRequest } from "./types";

export async function uploadFileFromTokenAction(formData: FormData) {
    const file = formData.get('file') as File;
    const token = formData.get('token') as string;

    if (!file || !token) {
        return { success: false, error: 'Falta el archivo o el token.' };
    }

    try {
        // Validate token using Admin SDK to ensure security
        const requestRef = adminDb.collection("fileRequests").doc(token);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists || requestSnap.data()?.status !== 'pending') {
            return { success: false, error: 'Token no válido o ya utilizado.' };
        }
        
        const fileRequest = requestSnap.data() as FileRequest;
        const { clubId, userId, userType, documentTitle, userName } = fileRequest;
        
        // Upload file to storage using Admin SDK
        const bucket = adminStorage.bucket("sportspanel.appspot.com");
        const filePath = `club-documents/${clubId}/${userId}/${uuidv4()}-${file.name}`;
        const fileUpload = bucket.file(filePath);
        
        const buffer = Buffer.from(await file.arrayBuffer());

        await fileUpload.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });
        
        // Create document entry in Firestore
        const newDocumentData = {
            name: documentTitle,
            path: filePath,
            createdAt: Timestamp.now(),
            ownerId: userId,
            ownerName: userName,
            category: 'otro', // Default category for requested files
        };
        
        await addDoc(adminDb.collection("clubs").doc(clubId).collection("documents"), newDocumentData);

        // Mark token as used
        await requestRef.update({
            status: 'completed',
            completedAt: Timestamp.now(),
            filePath: filePath,
        });
        
        return { success: true };

    } catch (error: any) {
        console.error("Error uploading file with token:", error);
        return { success: false, error: `Ocurrió un error en el servidor: ${error.message}` };
    }
}
