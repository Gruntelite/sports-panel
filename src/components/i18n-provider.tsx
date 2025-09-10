
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import es from '@/locales/es.json';
import ca from '@/locales/ca.json';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { ClubSettings } from '@/lib/types';

const translations = { es, ca };

type Locale = 'es' | 'ca';

interface I18nContextType {
  t: (key: string, params?: { [key: string]: string | number }) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('es');

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && (savedLocale === 'es' || savedLocale === 'ca')) {
      setLocale(savedLocale);
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const clubId = userDocSnap.data().clubId;
                    if (clubId) {
                        const settingsRef = doc(db, "clubs", clubId, "settings", "config");
                        const settingsSnap = await getDoc(settingsRef);
                        if (settingsSnap.exists()) {
                            const settings = settingsSnap.data() as ClubSettings;
                            if (settings.defaultLanguage) {
                                setLocale(settings.defaultLanguage);
                                localStorage.setItem('locale', settings.defaultLanguage);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching default language:", e);
            }
        }
    });

    return () => unsubscribe();
  }, []);

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  }, []);

  const t = useCallback((key: string, params?: { [key: string]: string | number }): string => {
    const lang = translations[locale] || translations.es;
    let result: any = lang;
    
    try {
        const keys = key.split('.');
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }
    } catch(e) {
        console.warn(`Error accessing translation key: ${key}`);
        return key;
    }
    
    if (typeof result === 'string' && params) {
      return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
        return acc.replace(`{${paramKey}}`, String(paramValue));
      }, result);
    }
    
    if(Array.isArray(result)){
      return result.map(item => item.label || item).join(', ');
    }

    return result || key;
  }, [locale]);
    
  return (
    <I18nContext.Provider value={{ t, locale, setLocale: handleSetLocale }}>
      {children}
    </I18nContext.Provider>
  );
}
