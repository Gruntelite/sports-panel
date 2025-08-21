
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
import { CheckCircle, Star, Palette, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Plan = 'basic' | 'pro' | 'elite';

function getLuminance(hex: string): number {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}


export default function ClubSettingsPage() {
    const { toast } = useToast();
    const [clubId, setClubId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [currentPlan, setCurrentPlan] = useState<Plan>('basic');
    const [clubName, setClubName] = useState('');
    const [themeColor, setThemeColor] = useState('#2563eb');
    
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const currentClubId = userDocSnap.data().clubId;
                    if (currentClubId) {
                        setClubId(currentClubId);
                        fetchSettings(currentClubId);
                    }
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchSettings = async (clubId: string) => {
        setLoading(true);
        try {
            const clubRef = doc(db, "clubs", clubId);
            const clubSnap = await getDoc(clubRef);
            if (clubSnap.exists()) {
                setClubName(clubSnap.data().name);
            }

            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
                const settingsData = settingsSnap.data();
                setCurrentPlan(settingsData?.billingPlan || 'basic');
                setThemeColor(settingsData?.themeColor || '#2563eb');
            }
        } catch (error) {
            console.error("Error fetching club settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ajustes." });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!clubId) return;
        setSaving(true);
        try {
            // Update club name
            const clubRef = doc(db, "clubs", clubId);
            await updateDoc(clubRef, { name: clubName });

            // Update theme color
            const luminance = getLuminance(themeColor);
            const foregroundColor = luminance > 0.5 ? '#000000' : '#ffffff';

            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await updateDoc(settingsRef, {
                themeColor: themeColor,
                themeColorForeground: foregroundColor
            });
            
            // Force theme update by setting local storage which the ThemeProvider listens to
            localStorage.setItem('clubThemeColor', themeColor);
            localStorage.setItem('clubThemeColorForeground', foregroundColor);
            window.dispatchEvent(new Event('storage')); // Notify other tabs/components

            toast({ title: "¡Guardado!", description: "La configuración del club ha sido actualizada. Recarga la página para ver los cambios en los colores." });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
        } finally {
            setSaving(false);
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

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
                    <CardTitle>Ajustes Generales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="clubName">Nombre del Club</Label>
                        <Input id="clubName" value={clubName} onChange={(e) => setClubName(e.target.value)} maxLength={30} />
                        <p className="text-xs text-muted-foreground">Se recomienda un máximo de 30 caracteres para una correcta visualización.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="clubColor">Color Principal del Club</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="clubColor"
                                type="color"
                                value={themeColor}
                                onChange={(e) => setThemeColor(e.target.value)}
                                className="p-1 h-10 w-14"
                            />
                            <Input
                                type="text"
                                value={themeColor}
                                onChange={(e) => setThemeColor(e.target.value)}
                                placeholder="#2563eb"
                                className="w-full"
                            />
                        </div>
                    </div>
                     <Button onClick={handleSaveChanges} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                    </Button>
                </CardContent>
            </Card>
            
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
                         <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold flex items-center gap-1.5"><Star className="h-3 w-3"/>El más popular</div>
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
    

    
