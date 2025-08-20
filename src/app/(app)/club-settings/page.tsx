
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
import { Loader2, Mail, Info, Send, Download } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { initiateSenderVerificationAction } from "@/lib/actions";

type VerificationStatus = "unconfigured" | "pending" | "verified" | "failed";

// This will be false on the server and true on the client if the key is set.
const isPlatformMailConfigured = process.env.NEXT_PUBLIC_SENDGRID_API_KEY_CONFIGURED === "true";

export default function ClubSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clubId, setClubId] = useState<string | null>(null);
    const [fromEmail, setFromEmail] = useState("");
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("unconfigured");
    const [mailConfigured, setMailConfigured] = useState(false);
    
    useEffect(() => {
        // We check this on the client-side to ensure env var is available.
        setMailConfigured(isPlatformMailConfigured);
    }, [])

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
        
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await setDoc(settingsRef, { 
                fromEmail: fromEmail,
                senderVerificationStatus: 'pending', // Set status to pending initially
            }, { merge: true });

            const result = await initiateSenderVerificationAction({ email: fromEmail, clubId });

            if (result.success) {
                toast({ 
                    title: "Verificación Iniciada", 
                    description: `Se ha enviado un correo de verificación a ${fromEmail}. Por favor, revisa tu bandeja de entrada.` 
                });
            } else {
                toast({ 
                    variant: "destructive",
                    title: "Error de Verificación", 
                    description: result.error 
                });
                 // Revert status if API call failed
                await setDoc(settingsRef, { senderVerificationStatus: 'unconfigured' }, { merge: true });
            }

            if(clubId) fetchSettings(clubId);
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
                           Configura desde qué dirección de correo electrónico se enviarán las comunicaciones del club.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                             <div className="flex items-center justify-center h-24">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : mailConfigured ? (
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
                                        disabled={verificationStatus === 'pending' || verificationStatus === 'verified'}
                                    />
                                </div>
                                 <div className="flex items-center justify-between">
                                    <Button onClick={handleSaveAndVerify} disabled={saving || verificationStatus === 'pending' || verificationStatus === 'verified'}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        {verificationStatus === 'pending' ? 'Verificación Pendiente' : 'Guardar y Verificar Correo'}
                                    </Button>
                                    {(verificationStatus === 'pending' || verificationStatus === 'verified') && (
                                        <Button variant="outline" onClick={() => setVerificationStatus('unconfigured')}>Cambiar Correo</Button>
                                    )}
                                 </div>
                            </>
                        ) : (
                             <div className="p-4 border-2 border-dashed rounded-lg text-center bg-muted/50">
                                <h3 className="text-lg font-semibold">Servicio de Correo No Configurado</h3>
                                <p className="text-muted-foreground text-sm mt-1 mb-4">
                                    Como administrador de la plataforma, necesitas configurar la integración con SendGrid para habilitar el envío de correos.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                    <Button asChild>
                                        <a href="/guia-sendgrid.pdf" download target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4"/>
                                            Descargar Guía (PDF)
                                        </a>
                                    </Button>
                                    <Button asChild variant="secondary">
                                        <a href="https://www.twilio.com/login" target="_blank" rel="noopener noreferrer">
                                            <Send className="mr-2 h-4 w-4"/>
                                            Ir a SendGrid
                                        </a>
                                    </Button>
                                 </div>
                             </div>
                        )}
                        <Accordion type="single" collapsible className="w-full mt-4 border rounded-lg px-4 bg-muted/50">
                            <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="py-3 hover:no-underline">
                                    <div className="flex items-center gap-2 font-semibold text-sm">
                                        <Info className="h-4 w-4" />
                                        ¿Cómo funciona el envío de correos?
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground space-y-2">
                                   <h4 className="font-bold text-foreground">Para el Administrador de la Plataforma:</h4>
                                   <p>
                                       Para que los clubes puedan verificar sus correos, la plataforma necesita una API Key global de SendGrid. Este es un paso de configuración único para toda la plataforma.
                                   </p>
                                   <ol className="list-decimal list-inside space-y-1 pl-2">
                                        <li>
                                            <b>Crea una cuenta:</b> Ve a <a href="https://www.twilio.com/login" target="_blank" rel="noopener noreferrer" className="text-primary underline">sendgrid.com</a> y regístrate.
                                        </li>
                                        <li>
                                            <b>Busca las API Keys:</b> En el menú de la izquierda de SendGrid, busca "Settings" y luego haz clic en "API Keys".
                                        </li>
                                         <li>
                                            <b>Crea la clave:</b> Haz clic en el botón "Create API Key". Dale un nombre (p.ej., "API Santa Coloma"), y selecciona "Full Access" para los permisos.
                                        </li>
                                        <li>
                                            <b>Guarda la clave:</b> SendGrid te mostrará la clave una sola vez. Cópiala inmediatamente.
                                        </li>
                                        <li>
                                            <b>Configura la clave:</b> Pega esta API Key en el archivo `.env` de tu proyecto, en una variable llamada `SENDGRID_API_KEY`.
                                        </li>
                                   </ol>
                                   <p className="mt-2 text-xs">
                                    Una vez completado, el mensaje de "Servicio de Correo No Configurado" desaparecerá y los clubes podrán empezar a verificar sus propias direcciones de correo.
                                   </p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    