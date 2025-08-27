
"use client";

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const subscriptionsQuery = query(
            collection(userDocRef, "subscriptions"),
            where("status", "in", ["trialing", "active"])
          );
          const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

          if (subscriptionsSnapshot.empty) {
            // No active or trialing subscription found
            router.push('/subscribe');
          } else {
            // User has a valid subscription
            setLoading(false);
          }
        } catch (error) {
          console.error("Error verifying subscription:", error);
          // Redirect to an error page or login page as a fallback
          router.push('/login');
        }
      } else {
        // No user is signed in.
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

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
