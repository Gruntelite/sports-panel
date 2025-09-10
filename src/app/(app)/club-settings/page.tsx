
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Star, Palette, Save, Loader2, Upload, KeyRound, Mail, Settings, CreditCard, PlusCircle, Trash2, ExternalLink, FilePlus2, ListPlus, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth, db, storage } from "@/lib/firebase";
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
import { useTranslation } from "@/components/i18n-provider";


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
    const { t } = useTranslation();
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
    
    const [activeTab, setActiveTab] = useState("settings");
     const tabs = [
        { id: "settings", label: t('clubSettings.tabs.settings'), icon: Settings },
        { id: "customization", label: t('clubSettings.tabs.customization'), icon: ListPlus },
        { id: "subscription", label: t('clubSettings.tabs.subscription'), icon: CreditCard },
    ];


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
            toast({ variant: "destructive", title: t('common.error'), description: t('clubSettings.errors.load') });
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

            toast({ title: t('common.saved'), description: t('clubSettings.success.general') });
            setNewLogo(null);
            setLogoPreview(null);
            if(newLogoUrl) setClubLogoUrl(newLogoUrl);
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ variant: "destructive", title: t('common.error'), description: t('clubSettings.errors.saveGeneral') });
        } finally {
            setSaving(false);
        }
    };
    
    const handleSaveSecurityChanges = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) return;

        if (!currentPassword) {
            toast({ variant: "destructive", title: t('common.error'), description: t('clubSettings.security.currentPasswordRequired') });
            return;
        }

        setSavingSecurity(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            if (newEmail !== user.email) {
                await updateEmail(user, newEmail);
                toast({ title: t('clubSettings.security.emailUpdatedTitle'), description: t('clubSettings.security.emailUpdatedDesc') });
            }

            if (newPassword) {
                if (newPassword !== confirmNewPassword) {
                    toast({ variant: "destructive", title: t('common.error'), description: t('clubSettings.security.passwordsNoMatch') });
                    setSavingSecurity(false);
                    return;
                }
                if (newPassword.length < 6) {
                    toast({ variant: "destructive", title: t('common.error'), description: t('clubSettings.security.passwordLength') });
                    setSavingSecurity(false);
                    return;
                }
                await updatePassword(user, newPassword);
                toast({ title: t('clubSettings.security.passwordUpdatedTitle'), description: t('clubSettings.security.passwordUpdatedDesc') });
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

        } catch (error: any) {
            console.error("Error updating security info:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast({ variant: "destructive", title: t('clubSettings.security.authErrorTitle'), description: t('clubSettings.security.authErrorDesc') });
            } else {
                toast({ variant: "destructive", title: t('common.error'), description: t('clubSettings.errors.saveSecurity') });
            }
        } finally {
            setSavingSecurity(false);
        }
    };
    
    const handleManageSubscription = () => {
      window.open("https://billing.stripe.com/p/login/5kQdRbehRgQHdIHbQy8k800", "_blank");
    };

    const handleAddCustomField = async () => {
        if (!clubId || !newFieldName.trim() || newFieldAppliesTo.length === 0) {
            toast({ variant: "destructive", title: t('clubSettings.customization.missingDataTitle'), description: t('clubSettings.customization.missingDataDesc') });
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
            toast({ title: t('clubSettings.customization.fieldAddedTitle'), description: t('clubSettings.customization.fieldAddedDesc') });
        } catch(e) {
            toast({ variant: "destructive", title: t('common.error'), description: t('clubSettings.errors.saveField') });
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
            toast({ title: t('clubSettings.customization.fieldRemovedTitle'), description: t('clubSettings.customization.fieldRemovedDesc') });
        } catch(e) {
            toast({ variant: "destructive", title: t('common.error'), description: t('clubSettings.errors.removeField') });
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
                <h1 className="text-2xl font-bold font-headline tracking-tight">{t('clubSettings.title')}</h1>
                <p className="text-muted-foreground">{t('clubSettings.description')}</p>
            </div>
            <div className="sm:hidden mb-4">
                <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger>
                        <SelectValue placeholder={t('clubSettings.selectSection')} />
                    </SelectTrigger>
                    <SelectContent>
                        {tabs.map((tab) => (
                            <SelectItem key={tab.id} value={tab.id}>
                                <div className="flex items-center gap-2">
                                    <tab.icon className="h-4 w-4" />
                                    {tab.label}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full hidden sm:block">
                <TabsList className="grid w-full grid-cols-3">
                     {tabs.map((tab) => (
                        <TabsTrigger key={tab.id} value={tab.id}><tab.icon className="mr-2 h-4 w-4"/>{tab.label}</TabsTrigger>
                     ))}
                </TabsList>
            </Tabs>

            <div className={cn(activeTab === 'settings' ? 'mt-6 space-y-6' : 'hidden')}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('clubSettings.general.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="clubName">{t('clubSettings.general.clubName')}</Label>
                            <Input id="clubName" value={clubName} onChange={(e) => setClubName(e.target.value)} maxLength={30} />
                            <p className="text-xs text-muted-foreground">{t('clubSettings.general.clubNameHint')}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clubLogo">{t('clubSettings.general.clubLogo')}</Label>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <Image src={logoPreview || clubLogoUrl || "https://placehold.co/100x100.png"} alt="Logo del club" width={100} height={100} className="rounded-md border p-2 bg-muted/30" />
                                <div className="flex-1 w-full space-y-2">
                                    <Input id="clubLogo" type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" />
                                    <Button asChild>
                                        <Link href="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel%20-%20Gu%C3%ADa%20de%20Uso.pdf?alt=media&token=9a5224e2-caed-42a7-b733-b343e284ce40" target="_blank">
                                        <Download className="mr-2 h-4 w-4" />
                                        {t('clubSettings.general.downloadGuide')}
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clubColor">{t('clubSettings.general.mainColor')}</Label>
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
                            <Save className="mr-2 h-4 w-4" /> {t('clubSettings.general.save')}
                        </Button>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>{t('clubSettings.security.title')}</CardTitle>
                        <CardDescription>{t('clubSettings.security.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="newEmail">{t('clubSettings.security.emailLabel')}</Label>
                            <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">{t('clubSettings.security.newPasswordLabel')}</Label>
                            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('clubSettings.security.newPasswordPlaceholder')}/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmNewPassword">{t('clubSettings.security.confirmPasswordLabel')}</Label>
                            <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2 pt-2 border-t">
                            <Label htmlFor="currentPassword">{t('clubSettings.security.currentPasswordLabel')}</Label>
                            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required/>
                        </div>
                        <Button onClick={handleSaveSecurityChanges} disabled={savingSecurity}>
                            {savingSecurity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <KeyRound className="mr-2 h-4 w-4" /> {t('clubSettings.security.save')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <div className={cn(activeTab === 'customization' ? 'mt-6 sm:mt-0' : 'hidden')}>
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1">
                            <CardTitle>{t('clubSettings.customization.title')}</CardTitle>
                            <CardDescription>{t('clubSettings.customization.description')}</CardDescription>
                        </div>
                        <Dialog open={isFieldModalOpen} onOpenChange={setIsFieldModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full mt-2 sm:mt-0 sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />{t('clubSettings.customization.addField')}</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('clubSettings.customization.modal.title')}</DialogTitle>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="newFieldName">{t('clubSettings.customization.modal.fieldName')}</Label>
                                        <Input id="newFieldName" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} placeholder={t('clubSettings.customization.modal.fieldNamePlaceholder')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="newFieldType">{t('clubSettings.customization.modal.fieldType')}</Label>
                                        <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as any)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">{t('clubSettings.customization.modal.types.text')}</SelectItem>
                                                <SelectItem value="number">{t('clubSettings.customization.modal.types.number')}</SelectItem>
                                                <SelectItem value="date">{t('clubSettings.customization.modal.types.date')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('clubSettings.customization.modal.appliesTo')}</Label>
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
                                                    <Label htmlFor={`applies-${type}`} className="capitalize">{t(`clubSettings.customization.modal.memberTypes.${type}`)}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="secondary">{t('common.cancel')}</Button></DialogClose>
                                    <Button onClick={handleAddCustomField} disabled={saving}>{saving && <Loader2 className="animate-spin mr-2"/>}{t('common.saveChanges')}</Button>
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
                                            <p className="text-xs text-muted-foreground">{t('clubSettings.customization.fieldInfo', { type: field.type, appliesTo: field.appliesTo.join(', ') })}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomField(field.id)} disabled={saving}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">{t('clubSettings.customization.noFields')}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
             <div className={cn('mt-6 sm:mt-0', activeTab !== 'subscription' && 'hidden')}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('clubSettings.subscription.title')}</CardTitle>
                        <CardDescription>{t('clubSettings.subscription.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p>{t('clubSettings.subscription.redirect')}</p>
                            <Button onClick={handleManageSubscription} disabled={loadingPortal}>
                                {loadingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <ExternalLink className="mr-2 h-4 w-4"/>
                                {t('clubSettings.subscription.portalButton')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
             </div>
        </div>
    );
}
