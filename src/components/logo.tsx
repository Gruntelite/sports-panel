
import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ width = 42, height = 42, withText = false, className }: { width?: number, height?: number, withText?: boolean, className?: string }) {
  if (withText) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel_logo_no_fondo.png?alt=media&token=d692cb56-60b1-4f00-a886-dd1cf340d043"
          alt="SportsPanel Logo"
          width={width}
          height={height}
          className="rounded-lg"
        />
        <span className="text-xl font-bold font-headline">SportsPanel</span>
      </div>
    )
  }
  return (
    <Image
      src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/SportsPanel_logo_no_fondo.png?alt=media&token=d692cb56-60b1-4f00-a886-dd1cf340d043"
      alt="SportsPanel Logo"
      width={width}
      height={height}
      className={cn("rounded-lg", className)}
    />
  );
}
