
"use client";

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            toast({ variant: "destructive", title: "Error", description: "Usuario no encontrado." });
            router.push('/login');
            return;
          }
          
          setLoading(false);

        } catch (error) {
          console.error("Error verifying auth status:", error);
          toast({ variant: "destructive", title: "Error", description: "Error al verificar la autenticación." });
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [router, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen w-full bg-muted/40">
        <Header />
        <Sidebar />
        <div className="flex flex-col md:pl-[220px] lg:pl-[280px] pt-16">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </div>
      </div>
  );
}
