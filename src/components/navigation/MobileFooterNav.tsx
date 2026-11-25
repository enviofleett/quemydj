'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, Compass, ListMusic, User, Layers, Radio, Wallet, Settings } from 'lucide-react';
import { useCueApp } from '@/context/CueAppContext';

export const MobileFooterNav: React.FC = () => {
  const pathname = usePathname();
  const { requests, currentUser } = useCueApp();

  const isDJArea = pathname.startsWith('/dj');
  const isWorkstation = pathname.startsWith('/dj');
  const isLogin = pathname === '/login';

  // Do not show separate mobile footer navigation on the DJ Workstation (it has its own responsive console tabs)
  if (isDJArea || isWorkstation || isLogin) return null;

  const activeCount = requests.filter(
    (r) => r.status === 'waiting' || r.status === 'accepted' || r.status === 'playing'
  ).length;

  const waitingForDjCount = requests.filter((r) => r.status === 'waiting').length;

  // Unregistered guests only see Connect (and Log In option)
  // Registered users unlock Wallet, Requests, and Profile
  const guestTabs = currentUser?.isRegistered
    ? [
        { label: 'Connect', href: '/', icon: QrCode },
        { label: 'Wallet', href: '/wallet', icon: Wallet },
        { label: 'Requests', href: '/requests', icon: ListMusic, badge: activeCount > 0 ? activeCount : null },
        { label: 'Profile', href: '/profile', icon: User },
      ]
    : [
        { label: 'Connect', href: '/', icon: QrCode },
        { label: 'Sign In', href: '/login', icon: User },
      ];

  const djTabs = [
    { label: 'Queue', href: '/dj/queue', icon: Layers, badge: waitingForDjCount > 0 ? waitingForDjCount : null },
    { label: 'Booth', href: '/dj', icon: Radio },
    { label: 'Earnings', href: '/dj/earnings', icon: Wallet },
    { label: 'Settings', href: '/dj/settings', icon: Settings },
  ];

  const currentTabs = isDJArea ? djTabs : guestTabs;

  return (
    <nav
      aria-label="Primary Bottom Navigation"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-16 bg-white/90 dark:bg-[#0c0d10]/90 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 px-2 flex items-center justify-around z-40 select-none transition-colors"
    >
      {currentTabs.map((tab) => {
        const isActive =
          tab.href === '/'
            ? pathname === '/'
            : tab.href === '/dj'
            ? pathname === '/dj'
            : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex flex-col items-center justify-center min-w-[68px] h-12 rounded-xl transition-colors active:scale-95 ${
              isActive ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25px]' : 'stroke-[1.75px]'}`} />
              {tab.badge !== null && tab.badge !== undefined && (
                <span className="absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[10px] font-semibold tabular-nums flex items-center justify-center ring-2 ring-white dark:ring-zinc-950">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className={`text-[11px] mt-1 tracking-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
