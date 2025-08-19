
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTemplateGenerator } from "@/components/email-template-generator";
import { RegistrationFormCreator } from "@/components/registration-form-creator";
import { Mail, ClipboardList } from "lucide-react";

export default function CommunicationsPage() {
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Comunicaciones</h1>
        <p className="text-muted-foreground">
          Genera emails para tu club o crea formularios de inscripción para eventos públicos.
        </p>
      </div>
      
      <Tabs defaultValue="email-templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email-templates">
            <Mail className="mr-2 h-4 w-4" />
            Plantillas de Email
          </TabsTrigger>
          <TabsTrigger value="registration-forms">
            <ClipboardList className="mr-2 h-4 w-4" />
            Formularios de Inscripción
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email-templates" className="mt-6">
          <EmailTemplateGenerator />
        </TabsContent>
        <TabsContent value="registration-forms" className="mt-6">
          <RegistrationFormCreator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
