
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
import { ArrowLeft } from "lucide-react";
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
        <Image 
          src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/A%C3%B1adir%20un%20t%C3%ADtulo%20(4).png?alt=media&token=f99b057a-e436-4f7d-8507-7bc767d161bf"
          alt="Jugadores celebrando"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="z-10 text-white max-w-md space-y-6">
             <div className="text-center">
                <p className="text-3xl font-bold text-shadow shadow-black/50">+130 clubs ya confían en nosotros</p>
            </div>
            <Separator className="bg-white/20" />
            <div className="text-center">
                <p className="text-3xl font-bold text-shadow shadow-black/50">+9h de Ahorro Semanal</p>
            </div>
            <Separator className="bg-white/20" />
            <div className="text-center">
                <p className="text-3xl font-bold text-shadow shadow-black/50">95% Tasa de Retención</p>
            </div>
        </div>
      </div>
      <div className="relative flex items-center justify-center py-12">
      <Link href="/" className="absolute top-8 left-8">
        <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto inline-block bg-card text-primary p-3 rounded-full mb-4">
            <Logo withText={true} />
          </div>
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
