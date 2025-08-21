import * as React from 'react';

export function Logo() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="rounded-corners">
          <rect width="100" height="100" rx="20" ry="20" />
        </clipPath>
      </defs>
      <g clipPath="url(#rounded-corners)">
        <rect width="100" height="100" fill="#34d399" />
        <path
          d="M 0,50 C 20,40 50,85 100,70 L 100,100 L 0,100 Z"
          fill="#3b82f6"
        />
      </g>
    </svg>
  );
}
