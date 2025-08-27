
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
import { CheckCircle, Star, Palette, Save, Loader2, Upload, KeyRound, Mail, Settings, CreditCard, PlusCircle, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db, storage, functions } from "@/lib/firebase";
import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { CustomFieldDef } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { httpsCallable } from "firebase/functions";


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
    const [savingSecurity, setSavingSecurity] = useState(false);
    const [loadingPortal, setLoadingPortal] = useState(false);

    const [clubName, setClubName] = useState('');
    const [themeColor, setThemeColor] = useState('#2563eb');
    
    const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
    const [newLogo, setNewLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null);
    
    const [isYearly, setIsYearly] = useState(false);

    // Security state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    
    // Custom Fields State
    const [customFields, setCustomFields] = useState<CustomFieldDef[]>([]);
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<CustomFieldDef['type']>('text');
    const [newFieldAppliesTo, setNewFieldAppliesTo] = useState<CustomFieldDef['appliesTo']>([]);


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
                setThemeColor(settingsData?.themeColor || '#2563eb');
                setClubLogoUrl(settingsData?.logoUrl || null);
                setOriginalLogoUrl(settingsData?.logoUrl || null);
                setCustomFields(settingsData?.customFields || []);
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
                if (originalLogoUrl && originalLogoUrl.includes('firebasestorage')) {
                    const oldLogoRef = ref(storage, originalLogoUrl);
                    try {
                        await deleteObject(oldLogoRef);
                    } catch (e) {
                        console.warn("Old logo could not be deleted, maybe it was already removed:", e);
                    }
                }
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

            if (newEmail !== user.email) {
                await updateEmail(user, newEmail);
                toast({ title: "Email Actualizado", description: "Tu dirección de correo electrónico ha sido cambiada." });
            }

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
    
    const handleManageSubscription = async () => {
        setLoadingPortal(true);
        try {
            const createPortalLink = httpsCallable(functions, 'ext-firestore-stripe-payments-createPortalLink');
            const { data } = await createPortalLink({ returnUrl: window.location.origin + "/club-settings" });
            window.location.assign((data as any).url);
        } catch (error: any) {
            console.error("Error creating Stripe portal link:", error);
            toast({ variant: "destructive", title: "Error", description: `No se pudo redirigir al portal de facturación: ${error.message}` });
        } finally {
            setLoadingPortal(false);
        }
    };

    const handleAddCustomField = async () => {
        if (!clubId || !newFieldName.trim() || newFieldAppliesTo.length === 0) {
            toast({ variant: "destructive", title: "Faltan datos", description: "Nombre y a quién aplica son obligatorios." });
            return;
        }
        
        const newField: CustomFieldDef = {
            id: `custom_${Date.now()}`,
            name: newFieldName.trim(),
            type: newFieldType,
            appliesTo: newFieldAppliesTo,
        };

        setSaving(true);
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await updateDoc(settingsRef, {
                customFields: arrayUnion(newField)
            });
            setCustomFields(prev => [...prev, newField]);
            setIsFieldModalOpen(false);
            setNewFieldName('');
            setNewFieldType('text');
            setNewFieldAppliesTo([]);
            toast({ title: "Campo añadido", description: "El nuevo campo personalizado ha sido guardado." });
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el campo." });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveCustomField = async (fieldId: string) => {
        if (!clubId) return;
        const fieldToRemove = customFields.find(f => f.id === fieldId);
        if (!fieldToRemove) return;
        
        setSaving(true);
        try {
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            await updateDoc(settingsRef, {
                customFields: arrayRemove(fieldToRemove)
            });
            setCustomFields(prev => prev.filter(f => f.id !== fieldId));
            toast({ title: "Campo eliminado", description: "El campo personalizado ha sido eliminado." });
        } catch(e) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el campo." });
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
            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/>Ajustes</TabsTrigger>
                    <TabsTrigger value="customization">Campos</TabsTrigger>
                    <TabsTrigger value="subscription">Suscripción</TabsTrigger>
                </TabsList>
                <TabsContent value="settings" className="mt-6">
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
                </TabsContent>
                <TabsContent value="customization" className="mt-6">
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle>Campos Personalizados</CardTitle>
                                <CardDescription>
                                    Añade campos adicionales a las fichas de tus miembros.
                                </CardDescription>
                            </div>
                            <Dialog open={isFieldModalOpen} onOpenChange={setIsFieldModalOpen}>
                                <DialogTrigger asChild>
                                    <Button><PlusCircle className="mr-2 h-4 w-4" />Añadir Campo</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Crear Campo Personalizado</DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="newFieldName">Nombre del Campo</Label>
                                            <Input id="newFieldName" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder="Ej: Nº Expediente" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="newFieldType">Tipo de Campo</Label>
                                            <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as any)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="text">Texto</SelectItem>
                                                    <SelectItem value="number">Número</SelectItem>
                                                    <SelectItem value="date">Fecha</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Aplica a</Label>
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                {(['player', 'coach', 'staff'] as const).map(type => (
                                                    <div key={type} className="flex items-center gap-2">
                                                        <Switch
                                                            id={`applies-${type}`}
                                                            checked={newFieldAppliesTo.includes(type)}
                                                            onCheckedChange={(checked) => {
                                                                const updated = new Set(newFieldAppliesTo);
                                                                if (checked) updated.add(type);
                                                                else updated.delete(type);
                                                                setNewFieldAppliesTo(Array.from(updated));
                                                            }}
                                                        />
                                                        <Label htmlFor={`applies-${type}`} className="capitalize">{type === 'player' ? 'Jugadores' : type === 'coach' ? 'Entrenadores' : 'Staff'}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="secondary">Cancelar</Button></DialogClose>
                                        <Button onClick={handleAddCustomField} disabled={saving}>{saving && <Loader2 className="animate-spin mr-2"/>}Guardar</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {customFields.length > 0 ? (
                                <ul className="space-y-2">
                                    {customFields.map(field => (
                                        <li key={field.id} className="flex items-center justify-between p-3 border rounded-md">
                                            <div>
                                                <p className="font-medium">{field.name}</p>
                                                <p className="text-xs text-muted-foreground">Tipo: {field.type} | Aplica a: {field.appliesTo.join(', ')}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomField(field.id)} disabled={saving}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No has creado ningún campo personalizado.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="subscription" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Suscripción y Pagos</CardTitle>
                            <CardDescription>
                                Gestiona tu plan, consulta tus facturas y actualiza tu método de pago.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <p>Para gestionar tu suscripción, serás redirigido al portal seguro de nuestro proveedor de pagos, Stripe.</p>
                                <Button onClick={handleManageSubscription} disabled={loadingPortal}>
                                    {loadingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    <ExternalLink className="mr-2 h-4 w-4"/>
                                    Ir al Portal de Cliente
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                 </TabsContent>
            </Tabs>
        </div>
    );
}
