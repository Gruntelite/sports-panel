
"use client";

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen w-full bg-muted/40">
        <Sidebar />
        <div className="flex flex-col md:ml-[220px] lg:ml-[280px]">
          <Header />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
