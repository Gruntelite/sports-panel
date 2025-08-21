import * as React from 'react';

export function Logo() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
    >
      <defs>
        <clipPath id="rounded-corners">
          <rect width="24" height="24" rx="4" ry="4" />
        </clipPath>
      </defs>
      <g clipPath="url(#rounded-corners)">
        <rect width="24" height="24" fill="#34D399" />
        <path
          d="M0 12L12 18V24H0V12Z"
          fill="#2563eb"
        />
        <path
          d="M12 18L24 12V24H12V18Z"
          fill="#1E40AF"
        />
      </g>
    </svg>
  );
}
