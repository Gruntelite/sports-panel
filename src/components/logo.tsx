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
      <path
        d="M0 0 H24 V24 C12 24 12 0 0 0Z"
        fill="#34D399"
      />
       <path
        d="M0 24 H24 V0 C12 0 12 24 0 24Z"
        fill="#2563eb"
      />
    </svg>
  );
}
