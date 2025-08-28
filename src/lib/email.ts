
'use server';

import { doc, getDoc } from "firebase/firestore";
import { db } from './firebase'; // Use server SDK
import type { ClubSettings } from "./types";
import nodemailer from "nodemailer";

interface Attachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

type EmailPayload = {
    clubId: string;
    recipients: { email: string, name: string }[];
    subject: string;
    htmlContent: string;
    attachments?: File[];
}

export async function sendEmailWithSmtpAction(payload: EmailPayload | FormData) {
    let clubId: string, recipients: { email: string, name: string }[], subject: string, htmlContent: string, files: File[] = [];

    if (payload instanceof FormData) {
        clubId = payload.get('clubId') as string;
        recipients = JSON.parse(payload.get('recipients') as string);
        subject = payload.get('subject') as string;
        htmlContent = payload.get('htmlContent') as string;
        files = payload.getAll('attachments') as File[];
    } else {
        clubId = payload.clubId;
        recipients = payload.recipients;
        subject = payload.subject;
        htmlContent = payload.htmlContent;
        files = payload.attachments || [];
    }

    if (!clubId || recipients.length === 0 || !subject || !htmlContent) {
        return { success: false, error: "Faltan parámetros para enviar el correo." };
    }
    
    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        const settingsSnap = await getDoc(settingsRef);
        
        if (!settingsSnap.exists()) {
            return { success: false, error: "No se ha encontrado la configuración de envío de correo para este club." };
        }
        
        const settings = settingsSnap.data() as ClubSettings;
        const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpFromEmail } = settings;
        const clubDocRef = doc(db, "clubs", clubId);
        const clubDocSnap = await getDoc(clubDocRef);
        const clubName = clubDocSnap.exists() ? clubDocSnap.data().name : 'Tu Club';
        
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !smtpFromEmail) {
             return { success: false, error: "La configuración SMTP no está completa. Por favor, revísala en los ajustes." };
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
        });

        const attachments: Attachment[] = [];
        for (const file of files) {
            if(file.size > 0) {
                const buffer = Buffer.from(await file.arrayBuffer());
                attachments.push({
                    filename: file.name,
                    content: buffer,
                    contentType: file.type,
                });
            }
        }
        
        for (const recipient of recipients) {
            await transporter.sendMail({
                from: `"${clubName}" <${smtpFromEmail}>`,
                to: recipient.email,
                subject: subject,
                html: htmlContent,
                attachments: attachments,
            });
        }

        return { success: true, count: recipients.length };

    } catch (error: any) {
        console.error("Error sending email via SMTP:", error);
         if (error.code === 'EENVELOPE' && error.command === 'API') {
            return {
                success: false,
                error: "Tu cuenta de envío de correo no está activada. Por favor, contacta con tu proveedor para solicitar la activación."
            }
        }
        return { success: false, error: `Error de SMTP: ${error.message}` };
    }
}
