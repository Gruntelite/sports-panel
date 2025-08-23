
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectEmailSender } from "@/components/direct-email-sender";
import { Mail, Send, Settings } from "lucide-react";


export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState("direct-send");

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Comunicaciones</h1>
        <p className="text-muted-foreground">
          Contacta con los miembros de tu club a través de correo electrónico.
        </p>
      </div>
      
      <DirectEmailSender />
    </div>
  );
}
