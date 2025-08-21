import * as React from 'react';
import Image from 'next/image';

export function Logo() {
  const logoUrl =
    'https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel_logo_no_fondo.png?alt=media';

  return (
    <Image
      src={logoUrl}
      alt="SportsPanel Logo"
      width={42}
      height={42}
      className="h-10 w-10"
      unoptimized
    />
  );
}
