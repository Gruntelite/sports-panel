
"use client";

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
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

            const subscriptionsQuery = query(
              collection(userDocRef, "subscriptions"),
              where("status", "in", ["trialing", "active"])
            );
            const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

            if (subscriptionsSnapshot.empty) {
                // No active subscription, check for a pending checkout session
                const checkoutSessionsQuery = query(
                    collection(userDocRef, 'checkout_sessions'),
                    orderBy('created', 'desc'),
                    limit(1)
                );
                const checkoutSnapshot = await getDocs(checkoutSessionsQuery);

                if (!checkoutSnapshot.empty) {
                    const latestCheckoutRef = checkoutSnapshot.docs[0].ref;
                    const unsubscribeCheckout = onSnapshot(latestCheckoutRef, (snap) => {
                         const { error, url } = snap.data() as { error?: { message: string }, url?: string };
                         if(url) {
                            unsubscribeCheckout();
                            window.location.assign(url);
                         } else if (error) {
                             unsubscribeCheckout();
                             router.push('/subscribe');
                         }
                    });
                } else {
                     router.push('/subscribe');
                }
            } else {
              setLoading(false);
            }
          } else {
             router.push('/login');
          }
        } catch (error) {
          console.error("Error verifying subscription:", error);
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
