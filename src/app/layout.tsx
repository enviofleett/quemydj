import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { CueAppProvider } from '@/context/CueAppContext';
import { MainShell } from '@/components/layout/MainShell';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'QueMyDJ — Powered by Zenbeatz | Live DJ Console & Venue Requests',
  description: 'QueMyDJ is powered by Zenbeatz — Pro DJ Console & Live Venue Song Request Network.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'QueMyDJ',
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
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-[var(--dj-bg-root)] text-[var(--dj-text-primary)] antialiased min-h-[100dvh] flex flex-col selection:bg-emerald-500 selection:text-black overflow-x-hidden transition-colors duration-200`}
      >
        <CueAppProvider>
          <MainShell>{children}</MainShell>
        </CueAppProvider>
      </body>
    </html>
  );
}
