
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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Info, Send, Save, RefreshCw } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { initiateSenderVerificationAction, checkSenderStatusAction } from "@/lib/actions";

type VerificationStatus = "unconfigured" | "pending" | "verified" | "failed";

export default function ClubSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [clubId, setClubId] = useState<string | null>(null);
    const [fromEmail, setFromEmail] = useState("");
    const [apiKey, setApiKey] = useState("");
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
                setApiKey(settingsData?.sendgridApiKey || "");
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
        if (!clubId || !fromEmail || !apiKey) {
            toast({ variant: "destructive", title: "Error", description: "La API Key y la dirección de correo son obligatorios." });
            return;
        }
        setSaving(true);
        
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await setDoc(settingsRef, { 
                fromEmail: fromEmail,
                sendgridApiKey: apiKey,
                senderVerificationStatus: 'pending',
            }, { merge: true });

            const result = await initiateSenderVerificationAction({ clubId });

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
    
    const handleCheckStatus = async () => {
      if (!clubId) return;
      setCheckingStatus(true);
      try {
        const result = await checkSenderStatusAction({ clubId });
        if (result.success) {
            if (result.data.verified) {
                setVerificationStatus('verified');
                await setDoc(doc(db, "clubs", clubId, "settings", "config"), { senderVerificationStatus: 'verified' }, { merge: true });
                toast({ title: "¡Verificado!", description: "Tu dirección de correo ha sido verificada correctamente." });
            } else {
                toast({ title: "Aún Pendiente", description: "La verificación todavía no se ha completado. Revisa tu email." });
            }
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
      } catch (error) {
        console.error("Error checking status:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo comprobar el estado de la verificación." });
      } finally {
        setCheckingStatus(false);
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
                           Configura desde qué dirección de correo y con qué API Key de SendGrid se enviarán las comunicaciones del club.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                             <div className="flex items-center justify-center h-24">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                             <>
                                <div className="space-y-2">
                                    <Label htmlFor="apiKey">Clave de API de SendGrid</Label>
                                    <Input 
                                        id="apiKey" 
                                        type="password" 
                                        placeholder="SG.xxxxxxxx"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        readOnly={verificationStatus === 'pending' || verificationStatus === 'verified'}
                                    />
                                </div>
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
                                        readOnly={verificationStatus === 'pending' || verificationStatus === 'verified'}
                                    />
                                </div>
                                 <div className="flex items-center gap-2">
                                    <Button onClick={handleSaveAndVerify} disabled={saving || verificationStatus === 'pending' || verificationStatus === 'verified'}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        <Save className="mr-2 h-4 w-4"/> 
                                        {verificationStatus === 'verified' ? 'Configuración Guardada' : 'Guardar y Verificar'}
                                    </Button>
                                    {verificationStatus === 'pending' && (
                                        <Button onClick={handleCheckStatus} variant="secondary" disabled={checkingStatus}>
                                            {checkingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            <RefreshCw className="mr-2 h-4 w-4"/>
                                            Comprobar Estado
                                        </Button>
                                    )}
                                     {verificationStatus === 'verified' && (
                                        <Button onClick={() => setVerificationStatus('unconfigured')} variant="destructive" size="sm">
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Cambiar
                                        </Button>
                                    )}
                                 </div>
                            </>
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
                                   <p>
                                       Para habilitar el envío de correos, cada club necesita su propia API Key de SendGrid y un correo de remitente verificado.
                                   </p>
                                   <ol className="list-decimal list-inside space-y-1 pl-2">
                                        <li>
                                            <b>Crea una cuenta de SendGrid:</b> Ve a <a href="https://www.twilio.com/login" target="_blank" rel="noopener noreferrer" className="text-primary underline">sendgrid.com</a> y regístrate.
                                        </li>
                                        <li>
                                            <b>Crea una API Key:</b> En SendGrid, ve a "Settings" {'>'} "API Keys". Crea una clave con permisos "Full Access".
                                        </li>
                                        <li>
                                            <b>Guarda la clave:</b> Pega la API Key y tu correo en los campos de arriba. Guarda y verifica.
                                        </li>
                                         <li>
                                            <b>Verifica tu email:</b> Recibirás un correo de SendGrid. Haz clic en el enlace para verificar que eres el propietario.
                                        </li>
                                        <li>
                                            <b>Comprueba el estado:</b> Vuelve aquí y haz clic en "Comprobar Estado" hasta que aparezca como "Verificado".
                                        </li>
                                   </ol>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
