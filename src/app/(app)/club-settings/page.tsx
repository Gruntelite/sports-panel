
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
import { Loader2, KeyRound, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ClubSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clubId, setClubId] = useState<string | null>(null);
    const [sendgridApiKey, setSendgridApiKey] = useState("");

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
                setSendgridApiKey(settingsData?.sendgridApiKey || "");
            }
        } catch (error) {
            console.error("Error fetching club settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ajustes." });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!clubId) return;
        setSaving(true);
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await updateDoc(settingsRef, { 
                sendgridApiKey: sendgridApiKey 
            });
            toast({ title: "Ajustes Guardados", description: "La clave de API de SendGrid se ha guardado correctamente." });
        } catch (error: any) {
            if (error.code === 'not-found') {
                try {
                    const settingsRef = doc(db, "clubs", clubId, "settings", "config");
                    await setDoc(settingsRef, { sendgridApiKey: sendgridApiKey }, { merge: true });
                     toast({ title: "Ajustes Guardados", description: "La clave de API de SendGrid se ha guardado correctamente." });
                } catch (createError) {
                    console.error("Error creating settings:", createError);
                    toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los ajustes." });
                }
            } else {
                console.error("Error updating settings:", error);
                toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los ajustes." });
            }
        } finally {
            setSaving(false);
        }
    };

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
                            <KeyRound className="h-5 w-5"/>
                            Integración de Correo (SendGrid)
                        </CardTitle>
                        <CardDescription>
                            Para enviar correos electrónicos (como las solicitudes de actualización de datos) desde tu propia dirección, necesitas una cuenta de SendGrid.
                            Pega aquí tu clave de API de SendGrid.
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
                                    <Label htmlFor="sendgrid-api-key">SendGrid API Key</Label>
                                    <Input 
                                        id="sendgrid-api-key" 
                                        type="password" 
                                        placeholder="SG.XXXXXXXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                                        value={sendgridApiKey}
                                        onChange={(e) => setSendgridApiKey(e.target.value)}
                                    />
                                </div>
                                 <div className="flex items-center justify-between">
                                    <Button onClick={handleSaveChanges} disabled={saving}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Guardar Clave
                                    </Button>
                                    <Button variant="link" asChild>
                                        <Link href="https://app.sendgrid.com/settings/api_keys" target="_blank">
                                            Obtener mi API Key de SendGrid
                                            <ExternalLink className="ml-2 h-4 w-4" />
                                        </Link>
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
                                        <AccordionContent className="text-muted-foreground">
                                            Para asegurar la entrega y respetar los límites de los proveedores, los correos se envían en lotes en segundo plano. Por ejemplo, el plan gratuito de SendGrid suele permitir unos 100 correos al día. Si envías una comunicación a más destinatarios, el sistema los procesará en grupos para no superar ese límite, asegurando que todos lleguen de forma fiable. Si necesitas más capacidad de envío, siempre puedes contratar un plan superior directamente con SendGrid.
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
