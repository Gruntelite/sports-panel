
'use client';

import { useTranslation } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const locales: ('es' | 'ca')[] = ['es', 'ca'];
const localeNames: {[key: string]: string} = {
    es: 'Castellano',
    ca: 'Català'
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="px-1 py-1.5 w-full">
        {locales.map((loc) => (
            <Button
                key={loc}
                variant="ghost"
                onClick={() => setLocale(loc)}
                disabled={locale === loc}
                className={cn("w-full justify-start", locale === loc && "font-bold")}
            >
            {localeNames[loc]}
            </Button>
        ))}
    </div>
  );
}

    