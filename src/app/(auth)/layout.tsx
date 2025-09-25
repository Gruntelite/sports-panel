
import * as React from 'react';

// This layout ensures that pages within the (auth) group, like login, register,
// and the public update-profile page, do not inherit the main app's sidebar and layout.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
