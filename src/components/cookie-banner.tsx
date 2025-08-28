"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    // Only show the banner if consent has not been given
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setShowBanner(false);
  };
  
  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'false');
    setShowBanner(false);
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card/95 backdrop-blur-sm border-t shadow-lg">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-card-foreground">
          Utilizamos cookies para mejorar tu experiencia en nuestro sitio. Al continuar, aceptas nuestro uso de cookies. Lee nuestra{' '}
          <Link href="/privacy" className="font-semibold underline hover:text-primary">
            Política de Privacidad
          </Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button onClick={handleAccept}>Aceptar</Button>
          <Button variant="outline" onClick={handleDecline}>Rechazar</Button>
        </div>
      </div>
    </div>
  );
}
