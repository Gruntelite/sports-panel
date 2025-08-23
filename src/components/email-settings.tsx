

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

const formSchema = z.object({
  sendPulseApiUserId: z.string().min(1, "El User ID de la API es obligatorio."),
  sendPulseApiSecret: z.string().min(1, "El API Secret es obligatorio."),
  sendPulseFromEmail: z.string().email("Debe ser un correo electrónico válido."),
});

type FormData = z.infer<typeof formSchema>;

export function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sendPulseApiUserId: "",
      sendPulseApiSecret: "",
      sendPulseFromEmail: "",
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
                        form.reset({
                            sendPulseApiUserId: settings.sendPulseApiUserId || "",
                            sendPulseApiSecret: settings.sendPulseApiSecret || "",
                            sendPulseFromEmail: settings.sendPulseFromEmail || "",
                        });
                    }
                }
            }
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [form]);

  async function onSubmit(values: FormData) {
    if (!clubId) return;
    setLoading(true);

    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await setDoc(settingsRef, values, { merge: true });

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
        setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Correo (SendPulse)</CardTitle>
        <CardDescription>Introduce tus credenciales API de SendPulse para habilitar el envío de correos.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
            <KeyRound className="h-4 w-4"/>
            <AlertTitle>¿Cómo obtener tus credenciales de SendPulse?</AlertTitle>
            <AlertDescription>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                    <li>Accede a tu cuenta de SendPulse (o crea una nueva).</li>
                    <li>Ve a "Ajustes de la cuenta" y luego a la pestaña "API".</li>
                    <li>Activa la API REST si no lo está.</li>
                    <li>Copia y pega tu "ID" y tu "Secreto" en los campos correspondientes.</li>
                </ol>
            </AlertDescription>
        </Alert>
        {loading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
             </div>
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="sendPulseApiUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu User ID de SendPulse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="sendPulseApiSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Secret</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Tu API Secret de SendPulse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="sendPulseFromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Remitente</FormLabel>
                    <FormControl>
                      <Input placeholder="tu-email-verificado@en-sendpulse.com" {...field} />
                    </FormControl>
                     <FormDescription>Este es el correo que aparecerá como remitente. Debe estar verificado en tu cuenta de SendPulse.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
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
