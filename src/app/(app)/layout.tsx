
"use client";

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { Header } from '@/components/layout/header';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { onSnapshot } from 'firebase/firestore';
import { createStripeCheckoutAction } from '@/lib/actions';

const DEV_CLUB_ID = "VWxHRR6HzumBnSdLfTtP"; // Club de pruebas

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  React.useEffect(() => {
    const handleSubscriptionRedirect = async (uid: string) => {
      setIsRedirecting(true);
      const { sessionId, error } = await createStripeCheckoutAction(uid);
      if (error || !sessionId) {
        console.error("Failed to create Stripe session:", error);
        // Maybe show a toast message to the user
        setIsRedirecting(false);
        return;
      }

      const sessionRef = doc(db, "users", uid, "checkout_sessions", sessionId);
      const unsubscribe = onSnapshot(sessionRef, (snap) => {
        const { error, url } = snap.data() || {};
        if (error) {
          console.error(`An error occurred: ${error.message}`);
          unsubscribe();
          setIsRedirecting(false);
        }
        if (url) {
          window.location.assign(url);
          unsubscribe();
        }
      });
    };

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
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

            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
            const settingsSnap = await getDoc(settingsRef);

            if (settingsSnap.exists()) {
              const settingsData = settingsSnap.data();
              const trialEndDate = (settingsData.trialEndDate as Timestamp)?.toDate();
              if (trialEndDate && new Date() < trialEndDate) {
                setLoading(false);
                return;
              }
            }

            const subscriptionsQuery = query(
              collection(db, "users", user.uid, "subscriptions"),
              where("status", "in", ["trialing", "active"])
            );
            const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

            if (!subscriptionsSnapshot.empty) {
              setLoading(false);
              return;
            }
            
            // If trial is over and no active subscription, redirect
            handleSubscriptionRedirect(user.uid);

          } else {
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

    return () => unsubscribeAuth();
  }, [router]);

  if (loading || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            {isRedirecting && <p className="text-muted-foreground">Redirigiendo al portal de pago...</p>}
        </div>
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
