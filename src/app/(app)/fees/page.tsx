
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { ClubSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Link, CheckCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { createStripeConnectAccountLinkAction } from "@/lib/actions";
import { useTranslation } from "@/components/i18n-provider";
import { useSearchParams, useRouter } from "next/navigation";

export default function FeesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const processPage = async (user: any) => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          toast({ variant: "destructive", title: "Error", description: "Usuario no encontrado." });
          router.push('/login');
          return;
        }

        const currentClubId = userDocSnap.data().clubId;
        setClubId(currentClubId);
        
        if (!currentClubId) {
            setLoading(false);
            return;
        }

        const settingsRef = doc(db, "clubs", currentClubId, "settings", "config");
        let settingsData: ClubSettings = {};
        
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
            settingsData = settingsSnap.data() as ClubSettings;
        }

        // Check if returning from Stripe onboarding
        if (searchParams.get('success') === 'true' && searchParams.get('clubId') === currentClubId) {
           await updateDoc(settingsRef, { stripeConnectOnboardingComplete: true });
           setOnboardingComplete(true);
           toast({ title: "¡Cuenta conectada!", description: "Tu cuenta de Stripe se ha conectado correctamente." });
           router.replace('/fees', { scroll: false });
        } else {
            setOnboardingComplete(settingsData.stripeConnectOnboardingComplete || false);
        }
      } catch (error) {
        console.error("Error processing fees page:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la información de la página."});
      } finally {
        setLoading(false);
      }
    };
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        processPage(user);
      } else {
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [searchParams, router, toast]);

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
        <h1 className="text-2xl font-bold font-headline tracking-tight">Cuotas y Pagos</h1>
        <p className="text-muted-foreground">
          Conecta tu cuenta de Stripe para empezar a cobrar cuotas a tus miembros de forma automática.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
            <CardTitle>Stripe Connect</CardTitle>
            <CardDescription>
                Conecta tu cuenta de Stripe para gestionar los pagos de cuotas de tus miembros de forma segura a través de nuestra plataforma.
            </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <p className="text-muted-foreground">Para empezar, necesitas conectar tu cuenta de Stripe. Serás redirigido a Stripe para completar un proceso de onboarding seguro.</p>
                     {!onboardingComplete && (
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
                     )}
                </div>
            </CardContent>
        </Card>

        <Card>
             <CardHeader>
                <CardTitle>Estado de la Conexión</CardTitle>
             </CardHeader>
             <CardContent>
                {onboardingComplete ? (
                     <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0"/>
                        <div className="flex-grow">
                            <h3 className="font-semibold text-green-700">Cuenta Conectada</h3>
                            <p className="text-sm text-green-600">¡Todo listo para empezar a gestionar los cobros!</p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4"/>
                                Ir a mi panel de Stripe
                            </a>
                        </Button>
                    </div>
                ) : (
                     <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <AlertTriangle className="h-8 w-8 text-yellow-600 flex-shrink-0"/>
                         <div>
                            <h3 className="font-semibold text-yellow-800">Conexión Pendiente</h3>
                            <p className="text-sm text-yellow-700">Completa el proceso de conexión con Stripe para activar el cobro de cuotas.</p>
                        </div>
                    </div>
                )}
             </CardContent>
        </Card>
      </div>
    </div>
  );
}
