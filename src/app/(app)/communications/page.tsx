
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, ClipboardList, UserCheck, Send } from "lucide-react";

export default function CommunicationsPage() {

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Comunicaciones</h1>
        <p className="text-muted-foreground">
          Genera y envía comunicaciones a los miembros de tu club.
        </p>
      </div>
       <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
          <p>La funcionalidad de comunicaciones se construirá aquí.</p>
        </div>
    </div>
  );
}
