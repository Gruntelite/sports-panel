
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, onSnapshot } from "firebase/firestore";

export default function SubscribePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleManageSubscription = async () => {
    if (!auth.currentUser) {
        toast({ variant: "destructive", title: "Error", description: "Debes estar autenticado." });
        setLoading(false);
        return;
    }

    try {
        const user = auth.currentUser;
        const userDocRef = doc(db, 'users', user.uid);
        
        const checkoutSessionRef = collection(userDocRef, 'checkout_sessions');

        const sessionDocRef = await addDoc(checkoutSessionRef, {
            price: "price_1S0TMLPXxsPnWGkZFXrjSAaw",
            success_url: window.location.origin + "/dashboard?subscription=success",
            cancel_url: window.location.origin + "/subscribe?subscription=cancelled",
            allow_promotion_codes: true,
            mode: 'subscription',
        });

        const unsubscribe = onSnapshot(sessionDocRef, (snap) => {
            const { error, url } = snap.data() as { error?: { message: string }, url?: string };
            if (error) {
                toast({ variant: "destructive", title: "Error", description: error.message });
                setLoading(false);
                unsubscribe();
            }
            if (url) {
                window.location.assign(url);
                unsubscribe();
            }
        });
        
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudo redirigir al portal de facturación: ${error.message}` });
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
            setUserEmail(user.email);
            setLoading(false);
            handleManageSubscription();
        } else {
            setLoading(false);
        }
    });
    return () => unsubscribe();
  }, []);


  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Suscripción Requerida</CardTitle>
          <CardDescription>
            Tu periodo de prueba ha finalizado o tu suscripción no está activa. Para continuar usando tu panel, necesitas una suscripción válida.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">
                    Redirigiendo a nuestro portal de pago seguro...
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
