
'use server';

import { doc, getDoc } from "firebase/firestore";
import { db } from './firebase'; // Use server SDK
import type { ClubSettings } from "./types";
import nodemailer from "nodemailer";


export async function sendEmailWithSmtpAction({
    clubId,
    recipients,
    subject,
    htmlContent,
}: {
    clubId: string,
    recipients: { email: string, name: string }[],
    subject: string,
    htmlContent: string
}) {
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
        const clubName = settings.clubName || 'Tu Club';
        
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

        for (const recipient of recipients) {
            await transporter.sendMail({
                from: `"${clubName}" <${smtpFromEmail}>`,
                to: recipient.email,
                subject: subject,
                html: htmlContent,
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
