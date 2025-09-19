
"use client";

// This component is now a no-op as the theme is fixed.
// It's kept to avoid breaking imports but can be removed in a future cleanup.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
