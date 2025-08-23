
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
import { Loader2, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";

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
        <Alert className="mb-6">
            <KeyRound className="h-4 w-4"/>
            <AlertTitle>Importante: Usa Contraseñas de Aplicación</AlertTitle>
            <AlertDescription>
                <p className="mt-2">
                    Por seguridad, proveedores como Gmail o Outlook requieren que crees una "Contraseña de Aplicación" para usar en servicios externos. No uses tu contraseña principal aquí.
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                    <li><b>Gmail:</b> Ve a tu Cuenta de Google > Seguridad > Verificación en dos pasos > Contraseñas de aplicaciones.</li>
                    <li><b>Outlook:</b> Ve a tu Cuenta de Microsoft > Seguridad > Opciones de seguridad avanzadas > Contraseñas de aplicación.</li>
                </ul>
            </AlertDescription>
        </Alert>
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

               <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña SMTP (Contraseña de Aplicación)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Tu contraseña de aplicación" {...field} />
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
