
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { createClubAction } from "@/lib/actions";
import { sports } from "@/lib/sports";
import { ArrowLeft, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

declare global {
    interface Window {
        fbq: (...args: any[]) => void;
    }
}

const registerSchema = z.object({
  clubName: z.string().min(3, { message: "El nombre del club debe tener al menos 3 caracteres." }),
  adminName: z.string().min(3, { message: "Tu nombre debe tener al menos 3 caracteres." }),
  sport: z.string().min(1, { message: "Debes seleccionar un deporte." }),
  themeColor: z.string().regex(/^#[0-9a-f]{6}$/i, { message: "Selecciona un color válido."}),
  email: z.string().email({ message: "Por favor, introduce un correo electrónico válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});


export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      clubName: "",
      adminName: "",
      sport: "",
      themeColor: "#2563eb",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setLoading(true);
    
    const eventId = uuidv4();
    const eventSourceUrl = window.location.href;
    const clientUserAgent = navigator.userAgent;

    if (window.fbq) {
      window.fbq('track', 'StartTrial', {}, {event_id: eventId});
    }
    
    const result = await createClubAction({ 
        ...values, 
        eventId,
        eventSourceUrl,
        clientUserAgent
    });

    if (result.success && result.userId && result.checkoutSessionId) {
      toast({
        title: "¡Ya casi estamos!",
        description: "Ahora serás redirigido para completar tu suscripción de prueba.",
      });
      
      const { userId, checkoutSessionId } = result;
      const userDocRef = doc(db, "users", userId);

      const checkoutSessionRef = doc(userDocRef, "checkout_sessions", checkoutSessionId);

      const unsubscribe = onSnapshot(checkoutSessionRef, async (snap) => {
        const { error, url } = snap.data() as {
          error?: { message: string };
          url?: string;
        };

        if (error) {
          unsubscribe();
          toast({ variant: "destructive", title: "Error de Pago", description: error.message });
          setLoading(false);
        }

        if (url) {
          unsubscribe();
          try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
          } catch(e) {
            console.warn("Sign in after registration failed, user will need to log in manually.", e)
          } finally {
            window.location.assign(url);
          }
        }
      });
      
    } else {
      toast({
        variant: "destructive",
        title: "Fallo en el Registro",
        description: result.error || "No se pudo completar el registro. Por favor, inténtalo de nuevo.",
      });
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative">
       <Button variant="outline" size="icon" className="absolute top-4 left-4" asChild>
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <Card className="mx-auto max-w-md w-full shadow-xl border">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto inline-block bg-card text-primary p-3 rounded-full mb-4">
            <Logo withText={true} />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">
            Crea tu Club
          </CardTitle>
          <CardDescription>
            Empieza a gestionar tu club en minutos. Rellena los datos para comenzar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clubName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Club</FormLabel>
                    <FormControl>
                      <Input placeholder="p.ej., Club Deportivo Águilas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="adminName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tu Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="p.ej., Carlos Sánchez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="sport"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Deporte Principal</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {sports.map(sport => (
                                    <SelectItem key={sport.value} value={sport.value}>{sport.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="themeColor"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Color Principal del Club</FormLabel>
                        <FormControl>
                            <div className="flex items-center gap-2">
                                <Input type="color" className="p-1 h-10 w-14" {...field} />
                                <Input type="text" value={field.value} onChange={field.onChange} placeholder="#2563eb" />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tu Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {loading ? 'Redirigiendo a pago...' : 'Empieza tu prueba de 20 días'}
              </Button>
               <p className="text-xs text-muted-foreground text-center">
                No se realizará ningún cargo durante el periodo de prueba
              </p>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            ¿Ya tienes una cuenta? <Link href="/login" className="text-primary hover:underline font-semibold">Inicia Sesión</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
