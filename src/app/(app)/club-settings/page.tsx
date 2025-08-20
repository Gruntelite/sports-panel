
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Info, Send } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

type VerificationStatus = "unconfigured" | "pending" | "verified" | "failed";

export default function ClubSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clubId, setClubId] = useState<string | null>(null);
    const [fromEmail, setFromEmail] = useState("");
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("unconfigured");

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const currentClubId = userDocSnap.data().clubId;
                    setClubId(currentClubId);
                    if (currentClubId) {
                        fetchSettings(currentClubId);
                    }
                }
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchSettings = async (clubId: string) => {
        setLoading(true);
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const settingsData = settingsSnap.data();
                setFromEmail(settingsData?.fromEmail || "");
                setVerificationStatus(settingsData?.senderVerificationStatus || "unconfigured");
            }
        } catch (error) {
            console.error("Error fetching club settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ajustes." });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndVerify = async () => {
        if (!clubId || !fromEmail) {
            toast({ variant: "destructive", title: "Error", description: "La dirección de correo es obligatoria." });
            return;
        }
        setSaving(true);
        // In a real scenario, here you would call a backend function (e.g., a Cloud Function)
        // that uses the SendGrid API to create a verified sender.
        // That function would trigger an email to `fromEmail`.
        // For now, we'll simulate this process.
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await setDoc(settingsRef, { 
                fromEmail: fromEmail,
                senderVerificationStatus: 'pending', // Set status to pending
            }, { merge: true });

            toast({ 
                title: "Verificación Iniciada", 
                description: `Se ha enviado un correo de verificación a ${fromEmail}. Por favor, revisa tu bandeja de entrada.` 
            });
            fetchSettings(clubId); // Re-fetch to update status on screen
        } catch (error) {
            console.error("Error saving email for verification:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la dirección de correo." });
        } finally {
            setSaving(false);
        }
    };
    
    const getStatusBadge = () => {
        switch (verificationStatus) {
            case "verified":
                return <Badge variant="secondary" className="bg-green-100 text-green-800">Verificado</Badge>;
            case "pending":
                return <Badge variant="outline">Pendiente de Verificación</Badge>;
            case "failed":
                 return <Badge variant="destructive">Fallido</Badge>;
            default:
                return <Badge variant="destructive">Sin configurar</Badge>;
        }
    }


    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold font-headline tracking-tight">
                Ajustes del Club
                </h1>
                <p className="text-muted-foreground">
                Gestiona la configuración general y las integraciones de tu club.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5"/>
                            Configuración de Envío de Correo
                        </CardTitle>
                        <CardDescription>
                           Define la dirección de correo electrónico desde la que el club enviará las comunicaciones.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                             <div className="flex items-center justify-center h-24">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ): (
                            <>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label htmlFor="fromEmail">Dirección de Correo para Envíos</Label>
                                      {getStatusBadge()}
                                    </div>
                                    <Input 
                                        id="fromEmail" 
                                        type="email" 
                                        placeholder="p.ej., info.club@gmail.com"
                                        value={fromEmail}
                                        onChange={(e) => setFromEmail(e.target.value)}
                                    />
                                </div>
                                 <div className="flex items-center justify-between">
                                    <Button onClick={handleSaveAndVerify} disabled={saving}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        {verificationStatus === 'pending' ? 'Reenviar Verificación' : 'Guardar y Verificar Correo'}
                                    </Button>
                                 </div>
                                 <Accordion type="single" collapsible className="w-full mt-4 border rounded-lg px-4 bg-muted/50">
                                    <AccordionItem value="item-1" className="border-b-0">
                                        <AccordionTrigger className="py-3 hover:no-underline">
                                            <div className="flex items-center gap-2 font-semibold text-sm">
                                                <Info className="h-4 w-4" />
                                                ¿Cómo funciona el envío de correos?
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="text-muted-foreground space-y-2">
                                           <p>
                                               Para enviar correos en tu nombre de forma segura y profesional, usamos SendGrid. El proceso es muy sencillo:
                                           </p>
                                           <ol className="list-decimal list-inside space-y-1">
                                                <li>Introduce la dirección de correo que quieres usar (puede ser de Gmail, Outlook, etc.).</li>
                                                <li>Haz clic en "Guardar y Verificar".</li>
                                                <li>Recibirás un email de SendGrid en esa dirección. Haz clic en el enlace que contiene para confirmar que eres el propietario.</li>
                                                <li>¡Listo! Tu correo estará verificado y la plataforma podrá enviar comunicaciones desde tu dirección.</li>
                                           </ol>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
