"use client";

import { useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

function hexToHsl(hex: string): { h: number, s: number, l: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyTheme = (primaryHex: string | null, foregroundHex: string | null) => {
      if (primaryHex) {
        const primaryHsl = hexToHsl(primaryHex);
        if (primaryHsl) {
          const primaryHslString = `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`;
          document.documentElement.style.setProperty('--primary', primaryHslString);
          localStorage.setItem('clubThemeColor', primaryHex);
        }
      }
      if (foregroundHex) {
        const foregroundHsl = hexToHsl(foregroundHex);
        if (foregroundHsl) {
          const foregroundHslString = `${foregroundHsl.h} ${foregroundHsl.s}% ${foregroundHsl.l}%`;
          document.documentElement.style.setProperty('--primary-foreground', foregroundHslString);
          localStorage.setItem('clubThemeColorForeground', foregroundHex);
        }
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
