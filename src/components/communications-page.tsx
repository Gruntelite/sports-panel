
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplateGenerator } from "@/components/email-template-generator";
import { RegistrationFormCreator } from "@/components/registration-form-creator";
import { Mail, ClipboardList, UserCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { TemplateHistoryItem, FormHistoryItem } from "@/lib/types";
import { DataUpdateSender } from "@/components/data-update-sender";


export default function CommunicationsPage() {

  const [emailHistory, setEmailHistory] = useState<TemplateHistoryItem[]>([]);
  const [formHistory, setFormHistory] = useState<FormHistoryItem[]>([]);

  const addEmailToHistory = (item: TemplateHistoryItem) => {
    setEmailHistory(prev => [item, ...prev]);
  }
  
  const addFormToHistory = (item: FormHistoryItem) => {
    setFormHistory(prev => [item, ...prev]);
  }

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Comunicaciones</h1>
        <p className="text-muted-foreground">
          Genera emails, crea formularios o solicita actualizaciones de datos a tus miembros.
        </p>
      </div>
      
      <Tabs defaultValue="email-templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email-templates">
            <Mail className="mr-2 h-4 w-4" />
            Plantillas de Email
          </TabsTrigger>
          <TabsTrigger value="registration-forms">
            <ClipboardList className="mr-2 h-4 w-4" />
            Formularios de Inscripción
          </TabsTrigger>
           <TabsTrigger value="data-update">
            <UserCheck className="mr-2 h-4 w-4" />
            Actualización de Datos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email-templates" className="mt-6 space-y-8">
          <EmailTemplateGenerator onTemplateGenerated={addEmailToHistory} />
          <Separator />
          <Card>
            <CardHeader>
                <CardTitle>Historial de Plantillas de Email</CardTitle>
                <CardDescription>Plantillas generadas anteriormente.</CardDescription>
            </CardHeader>
            <CardContent>
                {emailHistory.length > 0 ? (
                  <div className="space-y-4">
                    {emailHistory.map(item => (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <h4 className="font-semibold">{item.subject}</h4>
                        <p className="text-sm text-muted-foreground truncate">{item.body}</p>
                        <p className="text-xs text-muted-foreground mt-2">{item.date.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    <p>No se han generado plantillas de email todavía.</p>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registration-forms" className="mt-6 space-y-8">
          <RegistrationFormCreator onFormCreated={addFormToHistory} />
           <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Formularios</CardTitle>
                    <CardDescription>Formularios de inscripción creados anteriormente.</CardDescription>
                </CardHeader>
                <CardContent>
                     {formHistory.length > 0 ? (
                        <div className="space-y-4">
                            {formHistory.map(item => (
                            <div key={item.id} className="p-4 border rounded-lg">
                                <h4 className="font-semibold">{item.title}</h4>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">{item.url}</a>
                                <p className="text-xs text-muted-foreground mt-2">{item.date.toLocaleString()}</p>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <p>No se han creado formularios todavía.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="data-update" className="mt-6 space-y-8">
            <DataUpdateSender />
        </TabsContent>
      </Tabs>
    </div>
  );
}

    