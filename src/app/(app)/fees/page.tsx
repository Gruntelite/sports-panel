"use client";

import { TreasuryDashboard } from "@/components/treasury-dashboard";
import { useTranslation } from "@/components/i18n-provider";

export default function FeesPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">{t('treasury.tabs.fees')}</h1>
        <p className="text-muted-foreground">
          {t('treasury.fees.description')}
        </p>
      </div>
      <TreasuryDashboard defaultTab="fees" />
    </div>
  );
}
