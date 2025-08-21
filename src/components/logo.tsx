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
      <path d="M0 4C0 1.79086 1.79086 0 4 0H12V24H4C1.79086 24 0 22.2091 0 20V4Z" fill="#2563eb" />
      <path d="M12 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H12V0Z" fill="#34D399" />
    </svg>
  );
}
