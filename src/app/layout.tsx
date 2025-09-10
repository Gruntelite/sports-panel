
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { CookieBanner } from '@/components/cookie-banner';
import { I18nProvider } from '@/components/i18n-provider';

export const metadata: Metadata = {
  title: 'SportsPanel',
  description: 'La plataforma de gestión todo en uno para tu club deportivo.',
  icons: {
    icon: 'https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(10).png?alt=media&token=94fb008e-1e39-482a-9607-eae672943eba',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="https://firebasestorage.googleapis.com/v0/b/sportspanel.firebasestorage.app/o/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(10).png?alt=media&token=94fb008e-1e39-482a-9607-eae672943eba" type="image/png" sizes="any" />
      </head>
      <body className="font-body antialiased">
        <I18nProvider>
            {children}
        </I18nProvider>
        <Toaster />
        <CookieBanner />
      </body>
    </html>
  );
}

    