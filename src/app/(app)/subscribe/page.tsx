
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { createStripeCheckoutAction } from "@/lib/actions";


export default function SubscribePage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(true);
    
    useEffect(() => {
        const handleManageSubscription = async (uid: string) => {
             const { sessionId, error } = await createStripeCheckoutAction(uid);
            
            if (error || !sessionId) {
                toast({ variant: "destructive", title: "Error", description: "No se pudo crear la sesión de pago."});
                setIsRedirecting(false);
                return;
            }

            const sessionRef = doc(db, "users", uid, "checkout_sessions", sessionId);
            const unsubscribe = onSnapshot(sessionRef, (snap) => {
                const { error, url } = snap.data() || {};
                if (error) {
                    toast({ variant: "destructive", title: "Error", description: error.message });
                    unsubscribe();
                }
                if (url) {
                    window.location.assign(url);
                    unsubscribe();
                }
            });
            return () => unsubscribe();
        };

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                setLoading(false);
                handleManageSubscription(user.uid);
            }
        });
        
        return () => unsubscribeAuth();
    }, [toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Redirección en Progreso</CardTitle>
          <CardDescription>
            Un momento, te estamos redirigiendo a nuestro portal de pago seguro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">
              Preparando tu sesión...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
