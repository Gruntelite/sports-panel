
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectEmailSender } from "@/components/direct-email-sender";
import { Mail, Send, Settings } from "lucide-react";
import { EmailSettings } from "@/components/email-settings";
import { useTranslation } from "@/components/i18n-provider";


export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState("direct-send");
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">{t('sidebar.communications')}</h1>
        <p className="text-muted-foreground">
          {t('communications.description')}
        </p>
      </div>
      
       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct-send">
            <Send className="mr-2 h-4 w-4" />
            {t('communications.tabs.directSend')}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            {t('communications.tabs.settings')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="direct-send" className="mt-6">
          <DirectEmailSender />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <EmailSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
