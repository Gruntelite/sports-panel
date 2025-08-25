
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Star, Palette, Save, Loader2, Upload, KeyRound, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

type Plan = 'basic' | 'pro' | 'elite';

function getLuminance(hex: string): number {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

const pricing = {
    basic: { monthly: 29.99, yearly: Math.round(29.99 * 12 * 0.9) },
    pro: { monthly: 39.99, yearly: Math.round(39.99 * 12 * 0.9) },
    elite: { monthly: 59.99, yearly: Math.round(59.99 * 12 * 0.9) }
};


export default function ClubSettingsPage() {
    const { toast } = useToast();
    const [clubId, setClubId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingSecurity, setSavingSecurity] = useState(false);

    const [currentPlan, setCurrentPlan] = useState<Plan>('basic');
    const [clubName, setClubName] = useState('');
    const [themeColor, setThemeColor] = useState('#2563eb');
    
    const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
    const [newLogo, setNewLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null);

    // Security state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setNewEmail(user.email || '');
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
                setClubLogoUrl(settingsData?.logoUrl || null);
                setOriginalLogoUrl(settingsData?.logoUrl || null);
            }
        } catch (error) {
            console.error("Error fetching club settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ajustes." });
        } finally {
            setLoading(false);
        }
    };
    
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNewLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async () => {
        if (!clubId) return;
        setSaving(true);
        try {
            let newLogoUrl = clubLogoUrl;

            if (newLogo) {
                // Delete old logo if it exists and is not a placeholder
                if (originalLogoUrl && originalLogoUrl.includes('firebasestorage')) {
                    const oldLogoRef = ref(storage, originalLogoUrl);
                    try {
                        await deleteObject(oldLogoRef);
                    } catch (e) {
                        console.warn("Old logo could not be deleted, maybe it was already removed:", e);
                    }
                }
                // Upload new logo
                const logoPath = `club-logos/${clubId}/logo-${Date.now()}`;
                const logoRef = ref(storage, logoPath);
                await uploadBytes(logoRef, newLogo);
                newLogoUrl = await getDownloadURL(logoRef);
            }
            
            const clubRef = doc(db, "clubs", clubId);
            await updateDoc(clubRef, { name: clubName });

            const luminance = getLuminance(themeColor);
            const foregroundColor = luminance > 0.5 ? '#000000' : '#ffffff';

            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await setDoc(settingsRef, {
                themeColor: themeColor,
                themeColorForeground: foregroundColor,
                logoUrl: newLogoUrl
            }, { merge: true });
            
            localStorage.setItem('clubThemeColor', themeColor);
            localStorage.setItem('clubThemeColorForeground', foregroundColor);
            window.dispatchEvent(new Event('storage'));

            toast({ title: "¡Guardado!", description: "La configuración del club ha sido actualizada. Recarga la página para ver los cambios en los colores." });
            setNewLogo(null);
            setLogoPreview(null);
            if(newLogoUrl) setClubLogoUrl(newLogoUrl);
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
        } finally {
            setSaving(false);
        }
    };
    
    const handleSaveSecurityChanges = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) return;

        if (!currentPassword) {
            toast({ variant: "destructive", title: "Error", description: "Debes introducir tu contraseña actual para guardar los cambios." });
            return;
        }

        setSavingSecurity(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Change email if it's different
            if (newEmail !== user.email) {
                await updateEmail(user, newEmail);
                // Also update it in the user's document
                const userDocRef = doc(db, "clubs", clubId!, "users", user.uid);
                await updateDoc(userDocRef, { email: newEmail });
                toast({ title: "Email Actualizado", description: "Tu dirección de correo electrónico ha sido cambiada." });
            }

            // Change password if new one is provided
            if (newPassword) {
                if (newPassword !== confirmNewPassword) {
                    toast({ variant: "destructive", title: "Error", description: "Las nuevas contraseñas no coinciden." });
                    setSavingSecurity(false);
                    return;
                }
                if (newPassword.length < 6) {
                    toast({ variant: "destructive", title: "Error", description: "La nueva contraseña debe tener al menos 6 caracteres." });
                    setSavingSecurity(false);
                    return;
                }
                await updatePassword(user, newPassword);
                toast({ title: "Contraseña Actualizada", description: "Tu contraseña ha sido cambiada." });
            }

            // Reset fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

        } catch (error: any) {
            console.error("Error updating security info:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast({ variant: "destructive", title: "Error de Autenticación", description: "La contraseña actual es incorrecta." });
            } else {
                toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios de seguridad." });
            }
        } finally {
            setSavingSecurity(false);
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
                Gestiona la configuración general, seguridad y las integraciones de tu club.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-6">
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
                                <Label htmlFor="clubLogo">Logo del Club</Label>
                                <div className="flex items-center gap-4">
                                    <Image src={logoPreview || clubLogoUrl || "https://placehold.co/100x100.png"} alt="Logo del club" width={100} height={100} className="rounded-md border p-2 bg-muted/30" />
                                    <Input id="clubLogo" type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" />
                                </div>
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
                            <CardTitle>Seguridad de la Cuenta</CardTitle>
                            <CardDescription>Cambia tu email de inicio de sesión o tu contraseña.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="space-y-2">
                                <Label htmlFor="newEmail">Correo Electrónico de Acceso</Label>
                                <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Dejar en blanco para no cambiar"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña</Label>
                                <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                            </div>
                            <div className="space-y-2 pt-2 border-t">
                                <Label htmlFor="currentPassword">Contraseña Actual (para confirmar)</Label>
                                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required/>
                            </div>
                            <Button onClick={handleSaveSecurityChanges} disabled={savingSecurity}>
                                {savingSecurity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <KeyRound className="mr-2 h-4 w-4" /> Guardar Cambios de Seguridad
                            </Button>
                        </CardContent>
                    </Card>

                </div>

                 <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Plan de Suscripción</CardTitle>
                        <CardDescription>
                            Selecciona el plan que mejor se ajuste al tamaño y las necesidades de tu club.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <Card className={cn("flex flex-col p-6 text-center", currentPlan === 'basic' && "border-primary ring-2 ring-primary")}>
                            <h3 className="text-2xl font-bold font-headline">Club Básico</h3>
                            <p className="text-muted-foreground mt-1">Hasta <b>100</b> usuarios</p>
                            <div className="mt-4 flex items-baseline justify-center gap-2">
                                <span className="text-4xl font-bold">{pricing.basic.monthly}€</span>
                                <span className="text-muted-foreground self-end">/mes</span>
                            </div>
                            <ul className="mt-6 space-y-3 flex-grow text-left w-fit mx-auto">
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Gestión de miembros</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Gestión de equipos</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Calendario y horarios</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Tesorería y cuotas</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Comunicación con las familias</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Portal para familias</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Almacén de documentos</span></li>
                            </ul>
                            <Button variant="outline" className="mt-6 w-full" disabled={currentPlan === 'basic'}>
                                    {currentPlan === 'basic' ? 'Plan Actual' : 'Seleccionar Plan'}
                            </Button>
                        </Card>

                        <Card className={cn("relative flex flex-col p-6 text-center", currentPlan === 'pro' && "border-primary ring-2 ring-primary")}>
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold flex items-center gap-1.5"><Star className="h-3 w-3"/>El más popular</div>
                            <h3 className="text-2xl font-bold font-headline">Club Pro</h3>
                            <p className="text-muted-foreground mt-1">Hasta <b>150</b> usuarios</p>
                            <div className="mt-4 flex items-baseline justify-center gap-2">
                                <span className="text-4xl font-bold">{pricing.pro.monthly}€</span>
                                <span className="text-muted-foreground self-end">/mes</span>
                            </div>
                            <ul className="mt-6 space-y-3 flex-grow text-left w-fit mx-auto">
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Gestión de miembros</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Gestión de equipos</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Calendario y horarios</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Tesorería y cuotas</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Comunicación con las familias</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Portal para familias</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Almacén de documentos</span></li>
                            </ul>
                            <Button className="mt-6 w-full" disabled={currentPlan === 'pro'}>
                                {currentPlan === 'pro' ? 'Plan Actual' : 'Seleccionar Plan'}
                            </Button>
                        </Card>

                        <Card className={cn("flex flex-col p-6 text-center", currentPlan === 'elite' && "border-primary ring-2 ring-primary")}>
                            <h3 className="text-2xl font-bold font-headline">Club Élite</h3>
                            <p className="text-muted-foreground mt-1">Hasta <b>300</b> usuarios</p>
                            <div className="mt-4 flex items-baseline justify-center gap-2">
                                <span className="text-4xl font-bold">{pricing.elite.monthly}€</span>
                                <span className="text-muted-foreground self-end">/mes</span>
                            </div>
                            <ul className="mt-6 space-y-3 flex-grow text-left w-fit mx-auto">
                            <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Gestión de miembros</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Gestión de equipos</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Calendario y horarios</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Tesorería y cuotas</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Comunicación con las familias</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Portal para familias</span></li>
                                <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Almacén de documentos</span></li>
                            </ul>
                            <Button variant="outline" className="mt-6 w-full" disabled={currentPlan === 'elite'}>
                                {currentPlan === 'elite' ? 'Plan Actual' : 'Seleccionar Plan'}
                            </Button>
                        </Card>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
