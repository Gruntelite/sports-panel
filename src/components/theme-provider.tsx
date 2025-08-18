"use client";

import { useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
                    // Find the club where the user is an admin
                    const q = query(collection(db, "clubs"), where("adminId", "==", user.uid));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        // Assuming one admin belongs to one club
                        const clubDoc = querySnapshot.docs[0];
                        const settingsRef = doc(db, "clubs", clubDoc.id, "settings", "config");
                        const settingsSnap = await getDoc(settingsRef);

                        if (settingsSnap.exists()) {
                            const themeColor = settingsSnap.data()?.themeColor;
                            if (themeColor) {
                               applyTheme(themeColor)
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

    