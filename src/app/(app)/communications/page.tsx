
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send } from "lucide-react";
import { DirectEmailSender } from "@/components/direct-email-sender";


export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState("direct-send");

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Comunicaciones</h1>
        <p className="text-muted-foreground">
          Contacta con los miembros de tu club.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="direct-send">
            <Send className="mr-2 h-4 w-4" />
            Envío Directo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct-send" className="mt-6">
          <DirectEmailSender />
        </TabsContent>
      </Tabs>
    </div>
  );
}
