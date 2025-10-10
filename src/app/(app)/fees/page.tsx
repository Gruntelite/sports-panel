
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import type { ClubSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Link, CheckCircle, ExternalLink } from "lucide-react";
import { createStripeConnectAccountLinkAction } from "@/lib/actions";
import { loadStripe } from "@stripe/stripe-js";
import { useTranslation } from "@/components/i18n-provider";

export default function FeesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const currentClubId = userDocSnap.data().clubId;
          setClubId(currentClubId);
          if (currentClubId) {
            const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
              const settings = settingsSnap.data() as ClubSettings;
              setOnboardingComplete(settings.stripeConnectOnboardingComplete || false);
            }
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleConnectStripe = async () => {
    if (!clubId) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo identificar tu club." });
      return;
    }
    setConnecting(true);
    
    const result = await createStripeConnectAccountLinkAction({ clubId });
    
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error || "No se pudo generar el enlace de conexión." });
      setConnecting(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">{t('treasury.tabs.fees')}</h1>
        <p className="text-muted-foreground">
          Conecta tu cuenta de Stripe para empezar a cobrar cuotas a tus miembros de forma automática.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>
            Conecta tu cuenta de Stripe para gestionar los pagos de cuotas de tus miembros de forma segura a través de nuestra plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            {onboardingComplete ? (
                <div className="space-y-4">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto"/>
                    <h3 className="text-xl font-semibold">¡Tu cuenta está conectada!</h3>
                    <p className="text-muted-foreground">Ya puedes empezar a configurar y cobrar las cuotas a los miembros de tu club.</p>
                     <Button asChild variant="outline">
                        <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4"/>
                            Ir a mi panel de Stripe
                        </a>
                    </Button>
                </div>
            ) : (
                 <div className="space-y-4">
                    <p className="text-muted-foreground">Para empezar, necesitas conectar tu cuenta de Stripe. Serás redirigido a Stripe para completar un proceso de onboarding seguro.</p>
                    <Button onClick={handleConnectStripe} disabled={connecting}>
                        {connecting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                Redirigiendo a Stripe...
                            </>
                        ) : (
                            <>
                                <Link className="mr-2 h-4 w-4"/>
                                Conectar con Stripe
                            </>
                        )}
                    </Button>
                 </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
