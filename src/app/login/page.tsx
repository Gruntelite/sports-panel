
"use client";

import * as React from 'react';
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Logo } from "@/components/logo";
import Image from "next/image";
import { ArrowLeft, Star } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useTranslation();
  
  const stats = [
    { text: t('login.stats.0') },
    { text: t('login.stats.1') },
    { text: t('login.stats.2') },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: t('login.welcomeBack'),
        description: t('login.loginSuccess'),
      });

      router.push("/dashboard");

    } catch (error: any) {
      console.error("Login error:", error);
      let description = "Ocurrió un error inesperado.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === "auth/invalid-credential") {
        description = t('login.loginErrorDesc');
      }
      toast({
        variant: "destructive",
        title: t('login.loginError'),
        description: description,
      });
    } finally {
      setLoading(false);
    }
  };

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
            {stats.map((stat, index) => (
                <React.Fragment key={index}>
                    <div className="text-center">
                        <p className="text-4xl font-bold text-shadow shadow-black/50 whitespace-nowrap">{stat.text}</p>
                    </div>
                    {index < stats.length - 1 && <Separator className="bg-white/20" />}
                </React.Fragment>
            ))}
        </div>
      </div>
      <div className="relative flex flex-col items-center justify-center h-screen">
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
          <CardTitle className="text-2xl font-bold font-headline">
            {t('login.title')}
          </CardTitle>
          <CardDescription>
            {t('login.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.emailLabel')}</Label>
              <Input id="email" type="email" placeholder="m@ejemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.passwordLabel')}</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('login.loading') : t('login.button')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
            <p className="text-muted-foreground">
                {t('login.noAccount')}{" "}
                <Link href="/register" className="text-primary hover:underline font-semibold">{t('login.createAccount')}</Link>
            </p>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}
