
"use client";

import { useTranslation } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-sm font-medium gap-1 hover:bg-background/10 hover:text-white">
                <Languages className="h-4 w-4" />
                {locale === 'es' ? 'Castellano' : 'Català'}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setLocale('es')}>Castellano</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocale('ca')}>Català</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}

    