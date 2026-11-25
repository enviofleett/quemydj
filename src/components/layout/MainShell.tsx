'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { MobileFooterNav } from '@/components/navigation/MobileFooterNav';

export const MainShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isWorkstation = pathname === '/dj/workstation';
  const isLogin = pathname === '/login';
  const isAdmin = pathname.startsWith('/admin');
  const isVenue = pathname.startsWith('/venue');
  const isDJArea = pathname.startsWith('/dj');
  const isLandingPage = pathname === '/';

  if (isLandingPage) {
    return (
      <div className="w-full min-h-[100dvh] flex flex-col relative bg-[#fafafa] text-zinc-900 font-sans">
        {children}
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="w-full min-h-[100dvh] flex flex-col relative bg-[#f8f9fb] text-zinc-900 font-sans">
        {children}
      </div>
    );
  }

  if (isLogin) {
    return (
      <div className="w-full min-h-[100dvh] flex flex-col relative bg-[#090b0e] text-white">
        {children}
      </div>
    );
  }

  if (isVenue) {
    return (
      <div className="w-full min-h-[100dvh] flex flex-col relative bg-zinc-950 text-white max-w-[430px] mx-auto border-x border-zinc-800 shadow-2xl">
        {children}
      </div>
    );
  }

  return (
    <div
      className={`w-full min-h-[100dvh] flex flex-col relative transition-colors duration-300 ${
        isDJArea
          ? 'bg-[var(--dj-bg-root)] text-[var(--dj-text-primary)] pb-0'
          : 'max-w-[430px] mx-auto bg-white dark:bg-[#090a0d] text-zinc-950 dark:text-zinc-100 pb-24 border-x border-black/[0.08] dark:border-zinc-800/80 shadow-2xl'
      }`}
    >
      {children}
      <MobileFooterNav />
    </div>
  );
};
