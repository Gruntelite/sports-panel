
"use client";

import { TreasuryDashboard } from "@/components/treasury-dashboard";
import { useTranslation } from "@/components/i18n-provider";

export default function TreasuryPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">{t('sidebar.treasury')}</h1>
        <p className="text-muted-foreground">
          {t('treasury.description')}
        </p>
      </div>
      <TreasuryDashboard />
    </div>
  );
}
