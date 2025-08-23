
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
import { Loader2, Mail, Info, Save } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function EmailSettings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clubId, setClubId] = useState<string | null>(null);
    const [fromEmail, setFromEmail] = useState("");
    const [replyToEmail, setReplyToEmail] = useState("");
    const [apiKey, setApiKey] = useState("");
    
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
                setFromEmail(settingsData?.brevoFromEmail || "");
                setReplyToEmail(settingsData?.brevoReplyToEmail || "");
                setApiKey(settingsData?.brevoApiKey || "");
            }
        } catch (error) {
            console.error("Error fetching club settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ajustes." });
        } finally {
            setLoading(false);
        }
    };
    
    const handleSaveChanges = async () => {
        if (!clubId || !fromEmail || !apiKey || !replyToEmail) {
            toast({ variant: "destructive", title: "Error", description: "Todos los campos son obligatorios." });
            return;
        }
        setSaving(true);
        
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await setDoc(settingsRef, { 
                brevoFromEmail: fromEmail,
                brevoReplyToEmail: replyToEmail,
                brevoApiKey: apiKey,
            }, { merge: true });

            toast({ title: "¡Guardado!", description: "La configuración de correo ha sido actualizada." });
        } catch (error) {
            console.error("Error saving email settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la configuración." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5"/>
                    Configuración de Envío de Correo
                </CardTitle>
                <CardDescription>
                    Configura tu clave API de Brevo y tus correos para poder enviar comunicaciones.
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
                            <Label htmlFor="apiKey">Clave de API de Brevo</Label>
                            <Input 
                                id="apiKey" 
                                type="password" 
                                placeholder="xkeysib-xxxxxxxx"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fromEmail">Correo Remitente (Verificado en Brevo)</Label>
                            <Input 
                                id="fromEmail" 
                                type="email" 
                                placeholder="p.ej., noreply@tudominio.com"
                                value={fromEmail}
                                onChange={(e) => setFromEmail(e.target.value)}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="replyToEmail">Correo para Respuestas</Label>
                            <Input 
                                id="replyToEmail" 
                                type="email" 
                                placeholder="p.ej., contacto@tuclub.com"
                                value={replyToEmail}
                                onChange={(e) => setReplyToEmail(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleSaveChanges} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <Save className="mr-2 h-4 w-4"/> 
                            Guardar Configuración
                        </Button>
                    </>
                )}
                <Accordion type="single" collapsible className="w-full mt-4 border rounded-lg px-4 bg-muted/50">
                    <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="py-3 hover:no-underline">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                                <Info className="h-4 w-4" />
                                ¿Cómo configurar el envío con Brevo?
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground space-y-2">
                            <p>
                                Para enviar hasta 300 correos al día gratis, sigue estos pasos:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 pl-2">
                                <li>
                                    <b>Crea una cuenta en Brevo:</b> Ve a <a href="https://www.brevo.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">brevo.com</a> y regístrate en el plan gratuito.
                                </li>
                                <li>
                                    <b>Verifica tu dominio/email:</b> En Brevo, ve a "Senders & IP" y verifica el dominio o la dirección de correo que usarás para enviar.
                                </li>
                                <li>
                                    <b>Crea una API Key:</b> Ve a la sección "SMTP & API" y crea una nueva clave API v3.
                                </li>
                                <li>
                                    <b>Guarda la configuración:</b> Pega la clave API y tu correo verificado en los campos de arriba. En "Correo para Respuestas" puedes poner un email distinto (como un Gmail) donde quieras recibir las respuestas.
                                </li>
                            </ol>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
