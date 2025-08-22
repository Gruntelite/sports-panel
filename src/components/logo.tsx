import * as React from 'react';
import Image from 'next/image';

export function Logo({ width = 42, height = 42 }: { width?: number, height?: number }) {
  return (
    <Image
      src="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(10).png?alt=media&token=94fb008e-1e39-482a-9607-eae672943eba"
      alt="SportsPanel Logo"
      width={width}
      height={height}
      className="rounded-lg"
    />
  );
}
