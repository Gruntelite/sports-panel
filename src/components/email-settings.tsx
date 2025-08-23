
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { ClubSettings } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import Link from "next/link";

const formSchema = z.object({
  smtpHost: z.string().min(1, "El Host SMTP es obligatorio."),
  smtpPort: z.string().min(1, "El Puerto SMTP es obligatorio."),
  smtpUser: z.string().min(1, "El Usuario SMTP es obligatorio."),
  smtpPassword: z.string().min(1, "La Contraseña SMTP es obligatoria."),
  smtpFromEmail: z.string().email("Debe ser un correo electrónico válido."),
});

type FormData = z.infer<typeof formSchema>;
type Provider = "gmail" | "other";

export function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const { toast } = useToast();
  const [provider, setProvider] = useState<Provider>("gmail");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      smtpHost: "smtp.gmail.com",
      smtpPort: "465",
      smtpUser: "",
      smtpPassword: "",
      smtpFromEmail: "",
    },
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const currentClubId = userDocSnap.data().clubId;
                setClubId(currentClubId);
                if (currentClubId) {
                    const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
                    const settingsSnap = await getDoc(settingsRef);
                    if (settingsSnap.exists()) {
                        const settings = settingsSnap.data() as ClubSettings;
                        const host = settings.smtpHost || "";
                        if(host === "smtp.gmail.com"){
                           setProvider("gmail");
                        } else if (host) {
                           setProvider("other");
                        }
                        
                        form.reset({
                            smtpHost: settings.smtpHost || "smtp.gmail.com",
                            smtpPort: settings.smtpPort?.toString() || "465",
                            smtpUser: settings.smtpUser || "",
                            smtpPassword: settings.smtpPassword || "",
                            smtpFromEmail: settings.smtpFromEmail || "",
                        });
                    }
                }
            }
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [form]);

  const handleProviderChange = (value: Provider) => {
    setProvider(value);
    if (value === "gmail") {
        form.setValue("smtpHost", "smtp.gmail.com");
        form.setValue("smtpPort", "465");
    } else {
        form.setValue("smtpHost", "");
        form.setValue("smtpPort", "");
    }
  }
  
  useEffect(() => {
    const userEmail = form.watch("smtpUser");
    if (provider === 'gmail') {
      form.setValue("smtpFromEmail", userEmail);
    }
  }, [form, provider, form.watch("smtpUser")]);


  async function onSubmit(values: FormData) {
    if (!clubId) return;
    setSaving(true);

    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await setDoc(settingsRef, {
            ...values,
            smtpPort: Number(values.smtpPort)
        }, { merge: true });

        toast({
            title: "¡Configuración Guardada!",
            description: "Tu configuración de envío de correo ha sido actualizada.",
        });
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: "No se pudo guardar la configuración.",
        });
    } finally {
        setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Correo (SMTP)</CardTitle>
        <CardDescription>Introduce tus credenciales SMTP para habilitar el envío de correos desde tu propia cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
             </div>
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label>Proveedor de Correo</Label>
                    <Select value={provider} onValueChange={handleProviderChange}>
                        <SelectTrigger className="w-[280px]">
                           <SelectValue placeholder="Selecciona tu proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gmail">Gmail</SelectItem>
                            <SelectItem value="other">Otro (SMTP Personalizado)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                 <Alert variant="default">
                    <Info className="h-4 w-4"/>
                    <AlertTitle>Límites de Envío</AlertTitle>
                    <AlertDescription>
                        {provider === 'gmail' 
                         ? "Las cuentas de Gmail estándar tienen un límite de envío de 500 correos cada 24 horas. Las cuentas de Google Workspace pueden tener límites superiores."
                         : "Por favor, consulta con tu proveedor de correo para conocer los límites de envío diarios o por hora que aplican a tu cuenta."
                        }
                    </AlertDescription>
                </Alert>
                
                {provider === 'other' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="smtpHost"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Host SMTP</FormLabel>
                                <FormControl>
                                <Input placeholder="p.ej., smtp.miempresa.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="smtpPort"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Puerto SMTP</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="p.ej., 465, 587" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                )}
               
               <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario SMTP (Tu correo)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu-email@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {provider === 'other' && (
                <FormField
                    control={form.control}
                    name="smtpFromEmail"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email Remitente</FormLabel>
                        <FormControl>
                        <Input type="email" placeholder="noreply@ejemplo.com" {...field} />
                        </FormControl>
                        <FormDescription>Este es el correo que aparecerá como remitente. A veces debe ser el mismo que el usuario.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
                
                <Alert>
                    <KeyRound className="h-4 w-4"/>
                    <AlertTitle>Guía para obtener la Contraseña de Aplicación de Gmail</AlertTitle>
                    <AlertDescription>
                        <ol className="list-decimal list-inside space-y-2 mt-2">
                           <li>
                              <b>Activa la Verificación en 2 Pasos:</b> Es obligatorio. Si no la tienes, actívala en la página de Seguridad de Google.
                              <Button variant="link" asChild className="px-1 h-auto"><Link href="https://myaccount.google.com/security" target="_blank">Ir a Seguridad de Google <ExternalLink className="ml-1 h-3 w-3"/></Link></Button>
                           </li>
                           <li>
                              <b>Genera la contraseña:</b> Una vez activada la verificación, ve a la página de Contraseñas de Aplicaciones.
                              <Button variant="link" asChild className="px-1 h-auto"><Link href="https://myaccount.google.com/apppasswords" target="_blank">Ir a Contraseñas de Aplicaciones <ExternalLink className="ml-1 h-3 w-3"/></Link></Button>
                           </li>
                            <li>
                              En "Seleccionar aplicación", elige "Otra (nombre personalizado)", escribe "SportsPanel" y haz clic en "Generar".
                           </li>
                           <li>
                             Copia la contraseña de 16 letras que aparece y pégala en el campo de abajo.
                           </li>
                        </ol>
                    </AlertDescription>
                </Alert>

               <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña de Aplicación</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="xxxx xxxx xxxx xxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
                ) : (
                  'Guardar Configuración'
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
