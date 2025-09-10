
"use client";

import * as React from "react";
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
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createClubAction } from "@/lib/actions";
import { v4 as uuidv4 } from 'uuid';
import Image from "next/image";
import { useTranslation } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

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
  defaultLanguage: z.enum(['es', 'ca']),
});


export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { t, locale } = useTranslation();
  const sports = Array.isArray(t('sports', { returnObjects: true })) ? t('sports', { returnObjects: true }) as { label: string, value: string }[] : [];


  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      clubName: "",
      adminName: "",
      sport: "",
      themeColor: "#2563eb",
      email: "",
      password: "",
      defaultLanguage: locale,
    },
  });

  useEffect(() => {
    form.setValue('defaultLanguage', locale);
  }, [locale, form]);


  async function onSubmit(values: z.infer<typeof registerSchema>) {
    setLoading(true);
    
    if (window.fbq) {
      window.fbq('track', 'StartTrial');
    }

    try {
        const result = await createClubAction(values);

        if (result.success && result.userId) {
            toast({
                title: t('register.successTitle'),
                description: t('register.successDesc'),
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
        <div className="absolute top-4 left-4 z-10">
            <Link href="/" className="flex items-center gap-2 text-white">
                <Logo />
                <span className="font-bold text-lg">SportsPanel</span>
            </Link>
        </div>
        <div className="absolute top-4 right-4 z-10">
            <LanguageSwitcher />
        </div>
        <Image 
          src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/A%C3%B1adir%20un%20t%C3%ADtulo%20(4).png?alt=media&token=f99b057a-e436-4f7d-8507-7bc767d161bf"
          alt="Jugadores celebrando"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="z-10 text-white max-w-lg space-y-6 text-center">
            <h1 className="text-4xl font-bold text-shadow shadow-black/50">{t('register.trial.title')}</h1>
            <div className="space-y-4 flex flex-col items-center">
                <div className="flex items-center justify-start gap-3 w-fit">
                    <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-shadow shadow-black/50"/>
                    <span className="text-xl text-shadow shadow-black/50 whitespace-nowrap">{t('register.trial.0')}</span>
                </div>
                <div className="flex items-center justify-start gap-3 w-fit">
                    <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-shadow shadow-black/50"/>
                    <span className="text-xl text-shadow shadow-black/50 whitespace-nowrap">{t('register.trial.1')}</span>
                </div>
                <div className="flex items-center justify-start gap-3 w-fit">
                    <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-shadow shadow-black/50"/>
                    <span className="text-xl text-shadow shadow-black/50 whitespace-nowrap">{t('register.trial.2')}</span>
                </div>
                <div className="flex items-center justify-start gap-3 w-fit">
                    <CheckCircle2 className="h-7 w-7 flex-shrink-0 text-shadow shadow-black/50"/>
                    <span className="text-xl text-shadow shadow-black/50 whitespace-nowrap">{t('register.trial.3')}</span>
                </div>
            </div>
        </div>
      </div>
      <div className="relative flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <header className="absolute top-0 left-0 right-0 px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Logo />
                    <span className="font-bold text-lg">SportsPanel</span>
                </Link>
                <LanguageSwitcher />
            </div>
        </header>
        
        <Card className="mx-auto max-w-sm w-full border-none shadow-none lg:border lg:shadow-sm">
            <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-2xl font-bold font-headline">{t('register.title')}</CardTitle>
                <CardDescription>{t('register.description')}</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="clubName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('register.clubNameLabel')}</FormLabel>
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
                        <FormLabel>{t('register.adminNameLabel')}</FormLabel>
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
                            <FormLabel>{t('register.sportLabel')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {Array.isArray(sports) && sports.map(sport => (
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
                            <FormLabel>{t('register.colorLabel')}</FormLabel>
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
                    name="defaultLanguage"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Idioma por Defecto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="es">Castellano</SelectItem>
                                <SelectItem value="ca">Català</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('register.emailLabel')}</FormLabel>
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
                        <FormLabel>{t('register.passwordLabel')}</FormLabel>
                        <FormControl>
                        <Input type="password" placeholder={t('register.passwordDesc')} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {loading ? t('register.loading') : t('register.button')}
                </Button>
                </form>
            </Form>
             <p className="text-center text-xs text-muted-foreground mt-4">
                {t('register.ctaNote')}
            </p>
            <div className="mt-4 text-center text-sm">
                {t('register.hasAccount')}{" "}
                <Link href="/login" className="underline font-semibold">
                {t('register.login')}
                </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
