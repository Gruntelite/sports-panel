import * as React from 'react';

export function Logo() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
    >
      <defs>
        <clipPath id="rounded-square">
          <rect width="24" height="24" rx="4" />
        </clipPath>
      </defs>
      <g clipPath="url(#rounded-square)">
        <path
            d="M-2.98023e-08 12C-2.98023e-08 12 6 1.70588 12 8C18 14.2941 24 24 24 24L0 24L-2.98023e-08 12Z"
            fill="#2563eb"
        />
        <path
            d="M24 12C24 12 18 22.2941 12 16C6 9.70588 0 0 0 0L24 0L24 12Z"
            fill="#34D399"
        />
      </g>
    </svg>
  );
}
