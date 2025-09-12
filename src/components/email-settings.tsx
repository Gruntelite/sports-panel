
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { ClubSettings } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, ExternalLink, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import Link from "next/link";
import { useTranslation } from "./i18n-provider";

const formSchema = z.object({
  smtpHost: z.string().min(1, "El Host SMTP es obligatorio."),
  smtpPort: z.string().min(1, "El Puerto SMTP es obligatorio."),
  smtpUser: z.string().min(1, "El Usuario SMTP es obligatorio."),
  smtpPassword: z.string().min(1, "La Contraseña SMTP es obligatoria."),
  smtpFromEmail: z.string().email("Debe ser un correo electrónico válido."),
});

type FormData = z.infer<typeof formSchema>;
type Provider = "gmail" | "other";

export function EmailSettings() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clubId, setClubId] = useState<string | null>(null);
  const { toast } = useToast();
  const [provider, setProvider] = useState<Provider>("gmail");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      smtpHost: "smtp.gmail.com",
      smtpPort: "465",
      smtpUser: "",
      smtpPassword: "",
      smtpFromEmail: "",
    },
  });

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
                        const host = settings.smtpHost || "";
                        if(host === "smtp.gmail.com"){
                           setProvider("gmail");
                        } else if (host) {
                           setProvider("other");
                        }
                        
                        form.reset({
                            smtpHost: settings.smtpHost || "smtp.gmail.com",
                            smtpPort: settings.smtpPort?.toString() || "465",
                            smtpUser: settings.smtpUser || "",
                            smtpPassword: settings.smtpPassword || "",
                            smtpFromEmail: settings.smtpFromEmail || "",
                        });
                    }
                }
            }
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, [form]);

  const handleProviderChange = (value: Provider) => {
    setProvider(value);
    if (value === "gmail") {
        form.setValue("smtpHost", "smtp.gmail.com");
        form.setValue("smtpPort", "465");
    } else {
        form.setValue("smtpHost", "");
        form.setValue("smtpPort", "");
    }
  }
  
  useEffect(() => {
    const userEmail = form.watch("smtpUser");
    if (provider === 'gmail') {
      form.setValue("smtpFromEmail", userEmail);
    }
  }, [form, provider, form.watch("smtpUser")]);


  async function onSubmit(values: FormData) {
    if (!clubId) return;
    setSaving(true);

    try {
        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
        await setDoc(settingsRef, {
            ...values,
            smtpPort: Number(values.smtpPort)
        }, { merge: true });

        toast({
            title: t('emailSettings.successTitle'),
            description: t('emailSettings.successDesc'),
        });
    } catch (error) {
         toast({
            variant: "destructive",
            title: t('emailSettings.errors.saveErrorTitle'),
            description: t('emailSettings.errors.saveErrorDesc'),
        });
    } finally {
        setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('emailSettings.title')}</CardTitle>
        <CardDescription>{t('emailSettings.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
             </div>
        ) : (
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label>{t('emailSettings.provider')}</Label>
                    <Select value={provider} onValueChange={handleProviderChange}>
                        <SelectTrigger className="w-[280px]">
                           <SelectValue placeholder={t('emailSettings.selectProvider')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gmail">Gmail</SelectItem>
                            <SelectItem value="other">{t('emailSettings.otherProvider')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                 <Alert variant="default">
                    <Info className="h-4 w-4"/>
                    <AlertTitle>{t('emailSettings.limitAlertTitle')}</AlertTitle>
                    <AlertDescription>
                        {provider === 'gmail' 
                         ? t('emailSettings.limitAlertGmail')
                         : t('emailSettings.limitAlertOther')
                        }
                    </AlertDescription>
                </Alert>
                
                {provider === 'other' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="smtpHost"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Host SMTP</FormLabel>
                                <FormControl>
                                <Input placeholder={t('emailSettings.smtpHostPlaceholder')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="smtpPort"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Puerto SMTP</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder={t('emailSettings.smtpPortPlaceholder')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                )}
               
               <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('emailSettings.smtpUserLabel')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('emailSettings.smtpUserPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {provider === 'other' && (
                <FormField
                    control={form.control}
                    name="smtpFromEmail"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('emailSettings.fromEmailLabel')}</FormLabel>
                        <FormControl>
                        <Input type="email" placeholder={t('emailSettings.fromEmailPlaceholder')} {...field} />
                        </FormControl>
                        <FormDescription>{t('emailSettings.fromEmailDesc')}</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
                
                <Alert>
                    <KeyRound className="h-4 w-4"/>
                    <AlertTitle>{t('emailSettings.passwordGuide.title')}</AlertTitle>
                    <AlertDescription>
                        <ol className="list-decimal list-inside space-y-2 mt-2">
                          <li>
                            <b>{t('emailSettings.passwordGuide.step1Title')}</b> {t('emailSettings.passwordGuide.step1Desc')}
                            <Button variant="link" asChild className="px-1 h-auto"><Link href="https://myaccount.google.com/security" target="_blank">{t('emailSettings.passwordGuide.goToGoogleSecurity')} <ExternalLink className="ml-1 h-3 w-3"/></Link></Button>
                          </li>
                          <li>
                            <b>{t('emailSettings.passwordGuide.step2Title')}</b>
                            <Button variant="link" asChild className="px-1 h-auto"><Link href="https://myaccount.google.com/apppasswords" target="_blank">{t('emailSettings.passwordGuide.goToAppPasswords')} <ExternalLink className="ml-1 h-3 w-3"/></Link></Button>
                          </li>
                          <li>{t('emailSettings.passwordGuide.step3')}</li>
                          <li>{t('emailSettings.passwordGuide.step4')}</li>
                        </ol>
                    </AlertDescription>
                </Alert>

               <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('emailSettings.passwordLabel')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="xxxx xxxx xxxx xxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('emailSettings.saving')}</>
                ) : (
                  t('emailSettings.saveButton')
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
