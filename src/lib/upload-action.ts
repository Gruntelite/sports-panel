
'use server';

import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db as adminDb } from './firebase-admin'; // Use Admin SDK
import { storage as adminStorage } from './firebase'; // Storage can use client SDK for ref, but admin for actual upload if needed for permissions
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
        
        // Upload file to storage
        const filePath = `club-documents/${clubId}/${userId}/${uuidv4()}-${file.name}`;
        const fileRef = ref(adminStorage, filePath);
        const buffer = Buffer.from(await file.arrayBuffer());
        
        await uploadBytes(fileRef, buffer, {
            contentType: file.type,
        });

        const url = await getDownloadURL(fileRef);

        // Create document entry in Firestore
        const newDocumentData = {
            name: documentTitle,
            url,
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
