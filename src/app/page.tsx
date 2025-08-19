

"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Palette, Shield } from "lucide-react";
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
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { sports } from "@/lib/sports";
import Link from "next/link";

function hexToHsl(hex: string): { h: number, s: number, l: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

function getLuminance(hex: string): number {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}


export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [clubName, setClubName] = useState('');
  const [sport, setSport] = useState('');
  const [clubColor, setClubColor] = useState('#2563eb');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [open, setOpen] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sport) {
      toast({
        variant: "destructive",
        title: "Campo Obligatorio",
        description: "Por favor, selecciona un deporte.",
      });
      return;
    }
    setLoading(true);

    try {
      // Check if club name already exists
      const q = query(collection(db, "clubs"), where("name", "==", clubName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Fallo en el Registro",
          description: "El nombre del club ya está en uso. Por favor, elige otro.",
        });
        setLoading(false);
        return;
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const luminance = getLuminance(clubColor);
      const foregroundColor = luminance > 0.5 ? '#000000' : '#ffffff';

      // Create club, user records, and settings in a batch
      const batch = writeBatch(db);

      const newClubRef = doc(collection(db, "clubs"));
      const clubId = newClubRef.id;

      batch.set(newClubRef, {
        name: clubName,
        adminId: user.uid,
      });

      // Save user's clubId link in the root users collection
      const rootUserRef = doc(db, "users", user.uid);
      batch.set(rootUserRef, {
        clubId: clubId,
      });

      // Save user details in the club's specific users subcollection
      const clubUserRef = doc(collection(db, "clubs", clubId, "users"));
      batch.set(clubUserRef, {
        name: name,
        email: email,
        role: 'super-admin',
      });
      
      // Create club settings subcollection
      const settingsRef = doc(db, "clubs", clubId, "settings", "config");
      batch.set(settingsRef, {
        sport: sport,
        themeColor: clubColor,
        themeColorForeground: foregroundColor,
        billingPlan: null,
      });

      await batch.commit();

      const primaryHsl = hexToHsl(clubColor);
      const foregroundHsl = hexToHsl(foregroundColor);

      if (primaryHsl) {
        localStorage.setItem('clubThemeColor', clubColor);
      }
      if (foregroundHsl) {
        localStorage.setItem('clubThemeColorForeground', foregroundColor);
      }

      toast({
        title: "¡Cuenta Creada!",
        description: "Te has registrado correctamente.",
      });

      router.push("/dashboard");

    } catch (error: any) {
        console.error("Sign-up error:", error);
        let description = "Ocurrió un error inesperado.";
        if (error.code === 'auth/email-already-in-use') {
            description = "El correo electrónico ya está en uso. Por favor, utiliza otro.";
        }
        toast({
            variant: "destructive",
            title: "Fallo en el Registro",
            description: description,
        });
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
    const localTheme = localStorage.getItem('clubThemeColor');
    const localThemeForeground = localStorage.getItem('clubThemeColorForeground');
    if(localTheme && localThemeForeground) {
      const primaryHsl = hexToHsl(localTheme);
      const foregroundHsl = hexToHsl(localThemeForeground);
       if (primaryHsl && foregroundHsl) {
          document.documentElement.style.setProperty('--primary', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
          document.documentElement.style.setProperty('--primary-foreground', `${foregroundHsl.h} ${foregroundHsl.s}% ${foregroundHsl.l}%`);
       }
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto inline-block bg-primary text-primary-foreground p-3 rounded-full mb-4">
            <Shield className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">
            Bienvenido a SportsPanel
          </CardTitle>
          <CardDescription>
            Crea tu cuenta de administrador para empezar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="club-name">Nombre del Club</Label>
                <Input id="club-name" placeholder="p.ej., Dinamos del Centro" required value={clubName} onChange={(e) => setClubName(e.target.value)} />
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="sport">Deporte Principal</Label>
               <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                  >
                    {sport
                      ? sports.find((s) => s.value.toLowerCase() === sport.toLowerCase())?.label
                      : "Selecciona un deporte..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar deporte..." />
                    <CommandList>
                      <CommandEmpty>No se encontró el deporte.</CommandEmpty>
                      <CommandGroup>
                        {sports.map((s) => (
                          <CommandItem
                            key={s.value}
                            value={s.value}
                            onSelect={(currentValue) => {
                              setSport(currentValue === sport ? "" : currentValue);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                sport === s.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {s.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="club-color">Color del Club</Label>
              <div className="flex items-center gap-2">
                  <Input
                    id="club-color"
                    type="color"
                    value={clubColor}
                    onChange={(e) => setClubColor(e.target.value)}
                    className="p-1 h-10 w-14"
                  />
                  <Input
                    type="text"
                    value={clubColor}
                    onChange={(e) => setClubColor(e.target.value)}
                    placeholder="#2563eb"
                    className="w-full"
                  />
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="name">Tu Nombre</Label>
              <Input id="name" placeholder="p.ej., Alex García" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" placeholder="m@ejemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>
        </CardContent>
         <CardFooter className="flex justify-center text-sm">
            <p className="text-muted-foreground">
                ¿Ya tienes una cuenta? <Link href="/login" className="text-primary hover:underline font-semibold">Inicia sesión</Link>
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}

