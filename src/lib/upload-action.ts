
'use server';

import { db as adminDb, storage as adminStorage } from './firebase-admin'; // Use Admin SDK
import { v4 as uuidv4 } from "uuid";
import type { FileRequest } from "./types";
import { Timestamp } from "firebase-admin/firestore";

export async function uploadFileFromTokenAction(formData: FormData) {
    const file = formData.get('file') as File;
    const token = formData.get('token') as string;
    const requestId = formData.get('requestId') as string;

    if (!file || !token || !requestId) {
        return { success: false, error: 'Falta el archivo, el token o el ID de la solicitud.' };
    }
    
    if (file.size > 10 * 1024 * 1024) {
       return { success: false, error: 'El archivo no puede pesar más de 10 MB.' };
    }

    try {
        const requestRef = adminDb.collection("fileRequests").doc(requestId);
        const requestSnap = await requestRef.get();

        if (!requestSnap.exists) {
            return { success: false, error: 'Solicitud no válida o ya utilizada.' };
        }
        
        const fileRequest = requestSnap.data() as FileRequest;
        
        if (fileRequest.status !== 'pending' || fileRequest.token !== token) {
             return { success: false, error: 'Token no válido o solicitud ya completada.' };
        }

        const { clubId, userId, documentTitle, userName } = fileRequest;
        
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
            category: documentTitle,
        };
        
        await adminDb.collection("clubs").doc(clubId).collection("documents").add(newDocumentData);

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
