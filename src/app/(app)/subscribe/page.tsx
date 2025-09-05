
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
import { createPortalLinkAction } from "@/lib/actions";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function SubscribePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
            setUserEmail(user.email);
        }
    });
    return () => unsubscribe();
  }, []);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
        if (!auth.currentUser) throw new Error("User not authenticated.");
        
        const portalUrl = await createPortalLinkAction();
        window.location.href = portalUrl;

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudo redirigir al portal de facturación: ${error.message}` });
      setLoading(false);
    }
  };

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
          <p className="text-muted-foreground mb-6">
            Gestiona tu suscripción para seguir disfrutando de todas las ventajas de SportsPanel.
          </p>
          <Button onClick={handleManageSubscription} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirigiendo...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Gestionar mi Suscripción
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
