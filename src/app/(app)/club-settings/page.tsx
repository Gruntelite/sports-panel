
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
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Plan = 'basic' | 'pro' | 'elite';

export default function ClubSettingsPage() {
    const { toast } = useToast();
    const [currentPlan, setCurrentPlan] = useState<Plan>('basic');
    
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const currentClubId = userDocSnap.data().clubId;
                    if (currentClubId) {
                        fetchSettings(currentClubId);
                    }
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchSettings = async (clubId: string) => {
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const settingsData = settingsSnap.data();
                setCurrentPlan(settingsData?.billingPlan || 'basic');
            }
        } catch (error) {
            console.error("Error fetching club settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ajustes." });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold font-headline tracking-tight">
                Ajustes del Club
                </h1>
                <p className="text-muted-foreground">
                Gestiona la configuración general y las integraciones de tu club.
                </p>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Plan de Suscripción</CardTitle>
                    <CardDescription>
                        Selecciona el plan que mejor se ajuste al tamaño y las necesidades de tu club.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card className={cn("flex flex-col", currentPlan === 'basic' && "border-primary ring-2 ring-primary")}>
                        <CardHeader>
                            <CardTitle className="text-xl">Básico</CardTitle>
                            <CardDescription>Ideal para clubs pequeños que están empezando.</CardDescription>
                            <p className="text-3xl font-bold pt-2">24,99 €<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500" /> <span>Hasta <b>80</b> jugadores</span></div>
                            <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500" /> <span>Funcionalidades básicas</span></div>
                        </CardContent>
                        <CardHeader>
                            <Button disabled={currentPlan === 'basic'}>
                                {currentPlan === 'basic' ? 'Plan Actual' : 'Seleccionar Plan'}
                            </Button>
                        </CardHeader>
                    </Card>
                    <Card className={cn("flex flex-col relative", currentPlan === 'pro' && "border-primary ring-2 ring-primary")}>
                        <Card className="absolute -top-3 left-1/2 -translate-x-1/2"><Star className="h-3 w-3 mr-1.5"/>El más popular</Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Pro</CardTitle>
                            <CardDescription>Perfecto para clubs en crecimiento y con más equipos.</CardDescription>
                            <p className="text-3xl font-bold pt-2">34,99 €<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500" /> <span>Hasta <b>150</b> jugadores</span></div>
                            <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500" /> <span>Soporte prioritario</span></div>
                        </CardContent>
                        <CardHeader>
                           <Button disabled={currentPlan === 'pro'}>
                                {currentPlan === 'pro' ? 'Plan Actual' : 'Seleccionar Plan'}
                            </Button>
                        </CardHeader>
                    </Card>
                    <Card className={cn("flex flex-col", currentPlan === 'elite' && "border-primary ring-2 ring-primary")}>
                        <CardHeader>
                            <CardTitle className="text-xl">Élite</CardTitle>
                            <CardDescription>La solución completa para clubs grandes y academias.</CardDescription>
                             <p className="text-3xl font-bold pt-2">54,99 €<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500" /> <span>Hasta <b>300</b> jugadores</span></div>
                            <div className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-green-500" /> <span>Funciones avanzadas</span></div>
                        </CardContent>
                        <CardHeader>
                            <Button disabled={currentPlan === 'elite'}>
                                {currentPlan === 'elite' ? 'Plan Actual' : 'Seleccionar Plan'}
                            </Button>
                        </CardHeader>
                    </Card>
                </CardContent>
            </Card>
        </div>
    );
}
