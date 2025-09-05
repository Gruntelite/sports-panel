
"use client";

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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: "¡Bienvenido de nuevo!",
        description: "Has iniciado sesión correctamente.",
      });

      router.push("/dashboard");

    } catch (error: any) {
      console.error("Login error:", error);
      let description = "Ocurrió un error inesperado.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === "auth/invalid-credential") {
        description = "El correo electrónico o la contraseña son incorrectos.";
      }
      toast({
        variant: "destructive",
        title: "Fallo en el Inicio de Sesión",
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
            <div className="text-center">
                <p className="text-4xl font-bold text-shadow shadow-black/50 whitespace-nowrap">+130 Clubs nos Eligen cada Mes</p>
            </div>
            <Separator className="bg-white/20" />
            <div className="text-center">
                <p className="text-4xl font-bold text-shadow shadow-black/50 whitespace-nowrap">+9h de Ahorro Semanal</p>
            </div>
            <Separator className="bg-white/20" />
            <div className="text-center">
                <p className="text-4xl font-bold text-shadow shadow-black/50 whitespace-nowrap">95% Tasa de Retención</p>
            </div>
        </div>
      </div>
      <div className="relative flex flex-col items-center justify-center h-screen">
          <header className="absolute top-0 left-0 right-0 px-4 py-4 lg:hidden">
            <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Logo />
                    <span className="font-bold text-lg">SportsPanel</span>
                </Link>
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </header>

      <Card className="mx-auto max-w-sm w-full border-none shadow-none lg:border lg:shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold font-headline">
            Iniciar Sesión
          </CardTitle>
          <CardDescription>
            Introduce tus credenciales para acceder a tu panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" placeholder="m@ejemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm">
            <p className="text-muted-foreground">
                ¿No tienes una cuenta? <Link href="/register" className="text-primary hover:underline font-semibold">Crea una</Link>
            </p>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}
