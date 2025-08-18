"use client";

import { useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyTheme = (color: string | null) => {
      if (color) {
        document.documentElement.style.setProperty('--primary', color);
        localStorage.setItem('clubThemeColor', color);
      }
    };
    
    const localTheme = localStorage.getItem('clubThemeColor');
    if (localTheme) {
      applyTheme(localTheme);
    } else {
       const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const clubDocRef = doc(db, 'clubs', user.uid);
                    const clubDocSnap = await getDoc(clubDocRef);
                    if (clubDocSnap.exists()) {
                        const themeColor = clubDocSnap.data()?.themeColor;
                        if (themeColor) {
                           applyTheme(themeColor)
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
