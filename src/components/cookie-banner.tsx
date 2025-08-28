"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Script from 'next/script';

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (consent === 'true') {
      setConsentGiven(true);
      setShowBanner(false);
    } else if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setConsentGiven(true);
    setShowBanner(false);
  };
  
  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'false');
    setShowBanner(false);
  }

  if (!showBanner) {
    return consentGiven ? (
        <>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1404443150662262');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1404443150662262&ev=PageView&noscript=1"
          />
        </noscript>
      </>
    ) : null;
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
