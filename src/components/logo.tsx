
import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ width = 42, height = 42, withText = false, className }: { width?: number, height?: number, withText?: boolean, className?: string }) {
  if (withText) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Image
          src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(10).png?alt=media&token=94fb008e-1e39-482a-9607-eae672943eba"
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
      src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(10).png?alt=media&token=94fb008e-1e39-482a-9607-eae672943eba"
      alt="SportsPanel Logo"
      width={width}
      height={height}
      className={cn("rounded-lg", className)}
    />
  );
}

    