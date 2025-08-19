
"use client";

import { TreasuryDashboard } from "@/components/treasury-dashboard";

export default function TreasuryPage() {
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Tesorería</h1>
        <p className="text-muted-foreground">
          Gestiona las cuotas, pagos y la salud financiera de tu club.
        </p>
      </div>
      <TreasuryDashboard />
    </div>
  );
}
