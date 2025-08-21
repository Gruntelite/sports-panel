import * as React from 'react';

export function Logo() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="rounded">
          <rect x="0" y="0" width="400" height="400" rx="100" ry="100"/>
        </clipPath>
      </defs>
      <g clip-path="url(#rounded)">
        {/* izquierda turquesa */}
        <path d="M0,0 L400,0 L400,290 C260,340 160,50 0,110 Z" fill="#2ECCB6"/>
        {/* derecha azul */}
        <path d="M0,110 C160,50 260,340 400,290 L400,400 L0,400 Z" fill="hsl(var(--primary))"/>
      </g>
    </svg>
  );
}
