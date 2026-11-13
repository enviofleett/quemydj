import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CueAppProvider } from '@/context/CueAppContext';
import { MainShell } from '@/components/layout/MainShell';

export const metadata: Metadata = {
  title: 'QUEMYDJ — Live Social DJ Console & Venue Requests',
  description: 'Pro DJ Console & Live Venue Song Request Network.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QUEMYDJ',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cuemydj_theme_mode_v1');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.classList.add('theme-light');document.documentElement.classList.remove('dark');}else{document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.remove('theme-light');document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[var(--dj-bg-root)] text-[var(--dj-text-primary)] antialiased min-h-[100dvh] flex flex-col selection:bg-emerald-500 selection:text-black overflow-x-hidden transition-colors duration-200"
      >
        <CueAppProvider>
          <MainShell>{children}</MainShell>
        </CueAppProvider>
      </body>
    </html>
  );
}
