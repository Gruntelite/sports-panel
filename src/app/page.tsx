"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { sports } from "@/lib/sports";

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [clubName, setClubName] = useState('');
  const [sport, setSport] = useState('');
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
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user info to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        clubName,
        sport,
        role: 'Admin',
      });

       // Save club info to a 'clubs' collection
      await setDoc(doc(db, "clubs", user.uid), { // Using user UID as doc ID for simplicity
        name: clubName,
        sport,
        adminId: user.uid,
      });

      toast({
        title: "¡Cuenta Creada!",
        description: "Te has registrado correctamente.",
      });

      router.push("/dashboard");

    } catch (error: any) {
      console.error("Sign-up error:", error);
       toast({
        variant: "destructive",
        title: "Fallo en el Registro",
        description: error.message || "Ocurrió un error inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };


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
            <div className="space-y-2">
              <Label htmlFor="club-name">Nombre del Club</Label>
              <Input id="club-name" placeholder="p.ej., Dinamos del Centro" required value={clubName} onChange={(e) => setClubName(e.target.value)} />
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
              {loading ? 'Creando cuenta...' : 'Crear Cuenta e Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
