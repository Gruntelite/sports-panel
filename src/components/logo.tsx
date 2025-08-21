import * as React from 'react';

export function Logo() {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(90 50 50)">
        <path d="M 0 35 C 17 82 51 9 99 65 L 100 100 L 0 100 Z" fill="currentColor" />
      </g>
    </svg>
  );
}
