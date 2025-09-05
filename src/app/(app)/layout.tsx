
"use client";

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';

const DEV_CLUB_ID = "VWxHRR6HzumBnSdLfTtP"; // Club de pruebas

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
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const clubId = userData.clubId;

            if (clubId === DEV_CLUB_ID) {
              setLoading(false);
              return;
            }
            
            // First, check for an active Stripe subscription for paying customers
            const customerDocRef = doc(db, "customers", user.uid);
            const subscriptionsQuery = query(
              collection(customerDocRef, "subscriptions"),
              where("status", "in", ["trialing", "active"])
            );
            const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

            if (!subscriptionsSnapshot.empty) {
                // User has an active subscription.
                setLoading(false);
                return;
            }
            
            // If no subscription, check for the internal trial period for new sign-ups
            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            const settingsSnap = await getDoc(settingsRef);

            if (settingsSnap.exists()) {
                const settingsData = settingsSnap.data();
                const trialEndDate = (settingsData.trialEndDate as Timestamp)?.toDate();
                
                if (trialEndDate && new Date() < trialEndDate) {
                    setLoading(false); // User is within trial period, allow access.
                    return;
                }
            }
            
            // If no active subscription and trial is over, redirect to subscribe
            router.push('/subscribe');

          } else {
             // This case might happen if user is authenticated but user doc is not found
             router.push('/login');
          }
        } catch (error) {
          console.error("Error verifying auth status:", error);
          router.push('/login');
        }
      } else {
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
