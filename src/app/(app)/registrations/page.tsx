
"use client";

import { useState } from "react";
import { RegistrationFormCreator } from "@/components/registration-form-creator";
import type { FormHistoryItem } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


export default function RegistrationsPage() {
  
  const [formHistory, setFormHistory] = useState<FormHistoryItem[]>([]);

  const addFormToHistory = (item: FormHistoryItem) => {
    setFormHistory(prev => [item, ...prev]);
  }

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Inscripciones</h1>
        <p className="text-muted-foreground">
          Crea y gestiona formularios de inscripción para tus eventos, campus o captaciones.
        </p>
      </div>

       <div className="space-y-8">
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
        </div>
    </div>
  );
}
