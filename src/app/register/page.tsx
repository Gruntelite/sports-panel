
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { sports } from "@/lib/sports";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createClubAction } from "@/lib/actions";
import { v4 as uuidv4 } from 'uuid';
import Image from "next/image";

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
    
    if (window.fbq) {
      window.fbq('track', 'StartTrial');
    }

    try {
        const result = await createClubAction(values);

        if (result.success && result.userId) {
            toast({
                title: "¡Club Creado!",
                description: "Tu prueba de 20 días ha comenzado. ¡Bienvenido!",
            });
            
            await signInWithEmailAndPassword(auth, values.email, values.password);
            router.push("/dashboard");

        } else {
            toast({
                variant: "destructive",
                title: "Fallo en el Registro",
                description: result.error || "No se pudo completar el registro. Por favor, inténtalo de nuevo.",
            });
        }

    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Fallo en el Registro",
            description: error.message || "Ocurrió un error inesperado al contactar con el servidor.",
        });
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
       <div className="hidden lg:flex items-center justify-center p-8 relative overflow-hidden">
        <Image 
          src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/A%C3%B1adir%20un%20t%C3%ADtulo%20(4).png?alt=media&token=f99b057a-e436-4f7d-8507-7bc767d161bf"
          alt="Jugadores celebrando"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="z-10 text-white max-w-lg space-y-6 text-center">
            <h1 className="text-4xl font-bold text-shadow shadow-black/50">20 días de prueba gratis</h1>
            <ul className="text-xl space-y-4">
                 <li className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-shadow shadow-black/50"/>
                    <span className="text-shadow shadow-black/50 whitespace-nowrap">No necesitas tarjeta de crédito.</span>
                </li>
                 <li className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-shadow shadow-black/50"/>
                    <span className="text-shadow shadow-black/50 whitespace-nowrap">Sin compromiso de permanencia.</span>
                </li>
                 <li className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-shadow shadow-black/50"/>
                    <span className="text-shadow shadow-black/50 whitespace-nowrap">Cancela cuando quieras.</span>
                </li>
                 <li className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-shadow shadow-black/50"/>
                    <span className="text-shadow shadow-black/50 whitespace-nowrap">Accede a todas las funcionalidades.</span>
                </li>
            </ul>
        </div>
      </div>
      <div className="relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="absolute top-8 left-8">
            <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </Link>
        <Card className="mx-auto max-w-sm w-full">
            <CardHeader className="space-y-2 text-center">
                <Logo withText={true} className="justify-center mb-4"/>
                <CardTitle className="text-2xl font-bold font-headline">Crea tu Club</CardTitle>
                <CardDescription>Empieza a gestionar tu club en minutos.</CardDescription>
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
                            <FormLabel>Color Principal</FormLabel>
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
                    {loading ? 'Creando tu club...' : 'Empezar Prueba Gratuita'}
                </Button>
                </form>
            </Form>
            <div className="mt-4 text-center text-sm">
                ¿Ya tienes una cuenta?{" "}
                <Link href="/login" className="underline font-semibold">
                Inicia Sesión
                </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
