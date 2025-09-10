
'use client';

import React, { createContext, useContext } from 'react';
import es from '@/locales/es.json';
import ca from '@/locales/ca.json';

const translations = { es, ca };

const I18nContext = createContext<{
    t: (key: string) => string;
}>({
    t: () => '',
});

export function useTranslation() {
    return useContext(I18nContext);
}

export function I18nProvider({ children, locale }: { children: React.ReactNode, locale: string }) {
    const t = (key: string): string => {
        const lang = locale === 'ca' ? 'ca' : 'es';
        const keys = key.split('.');
        let result: any = translations[lang];

        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) {
                return key; // Return key if not found
            }
        }
        return result || key;
    };
    
    return (
        <I18nContext.Provider value={{ t }}>
            {children}
        </I18nContext.Provider>
    );
}
