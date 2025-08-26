
'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { db as adminDb, storage as adminStorage } from './firebase-admin'; // Use Admin SDK
import { v4 as uuidv4 } from "uuid";
import type { FileRequest } from "./types";

export async function uploadFileFromTokenAction(formData: FormData) {
    const file = formData.get('file') as File;
    const token = formData.get('token') as string;

    if (!file || !token) {
        return { success: false, error: 'Falta el archivo o el token.' };
    }
    
    if (file.size > 10 * 1024 * 1024) {
       return { success: false, error: 'El archivo no puede pesar más de 10 MB.' };
    }

    try {
        const requestRef = adminDb.collection("fileRequests").doc(token);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists() || requestSnap.data()?.status !== 'pending') {
            return { success: false, error: 'Token no válido o ya utilizado.' };
        }
        
        const fileRequest = requestSnap.data() as FileRequest;
        const { clubId, userId, userType, documentTitle, userName } = fileRequest;
        
        const bucket = adminStorage.bucket();
        const filePath = `club-documents/${clubId}/${userId}/${uuidv4()}-${file.name}`;
        const fileUpload = bucket.file(filePath);
        
        const buffer = Buffer.from(await file.arrayBuffer());

        await fileUpload.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });
        
        const newDocumentData = {
            name: documentTitle,
            path: filePath,
            createdAt: Timestamp.now(),
            ownerId: userId,
            ownerName: userName,
            category: 'otro', 
        };
        
        await addDoc(adminDb.collection("clubs").doc(clubId).collection("documents"), newDocumentData);

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
