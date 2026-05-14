import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Geist_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GoogleAnalyticsPageViews } from '@/components/GoogleAnalyticsPageViews';
import { GA_MEASUREMENT_ID } from '@/lib/google-analytics';

const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const _geistMono = Geist_Mono({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HyreLog - Secure. Immutable. Auditable.',
  description: 'Enterprise-grade audit logging and compliance platform',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyWebSite'
  },
  icons: {
    icon: [
      {
        url: '/icon1.png',
        type: 'image/png'
      },
      {
        url: '/icon0.svg',
        type: 'image/svg+xml'
      },
      {
        url: '/favicon.ico',
        sizes: 'any'
      }
    ],
    apple: [
      {
        url: '/apple-icon.png',
        type: 'image/png'
      }
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body
        className={`font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
          <Suspense fallback={null}>
            <GoogleAnalyticsPageViews />
          </Suspense>
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
