"use client";

import { useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyTheme = (primary: string | null, foreground: string | null) => {
      if (primary) {
        document.documentElement.style.setProperty('--primary', primary);
        localStorage.setItem('clubThemeColor', primary);
      }
      if (foreground) {
        document.documentElement.style.setProperty('--primary-foreground', foreground);
        localStorage.setItem('clubThemeColorForeground', foreground);
      }
    };
    
    const localTheme = localStorage.getItem('clubThemeColor');
    const localThemeForeground = localStorage.getItem('clubThemeColorForeground');

    if (localTheme && localThemeForeground) {
      applyTheme(localTheme, localThemeForeground);
    } else {
       const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        const clubId = userData.clubId;

                        if (clubId) {
                            const settingsRef = doc(db, "clubs", clubId, "settings", "config");
                            const settingsSnap = await getDoc(settingsRef);

                            if (settingsSnap.exists()) {
                                const settingsData = settingsSnap.data();
                                const themeColor = settingsData?.themeColor;
                                const themeColorForeground = settingsData?.themeColorForeground;
                                if (themeColor && themeColorForeground) {
                                   applyTheme(themeColor, themeColorForeground)
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching club theme:", error);
                }
            }
        });
        return () => unsubscribe();
    }
  }, []);

  return <>{children}</>;
}
