'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Compass, ListMusic, User, QrCode, Wallet, LogIn } from 'lucide-react';
import { useCueApp } from '@/context/CueAppContext';

export const GuestNav: React.FC = () => {
  const pathname = usePathname();
  const { requests, currentUser } = useCueApp();

  const activeCount = requests.filter(
    (r) => r.status === 'waiting' || r.status === 'accepted' || r.status === 'playing'
  ).length;

  const navItems = currentUser?.isRegistered
    ? [
        {
          label: 'Connect',
          href: '/',
          icon: QrCode,
          match: ['/'],
        },
        {
          label: 'Wallet',
          href: '/wallet',
          icon: Wallet,
          match: ['/wallet'],
        },
        {
          label: 'My Requests',
          href: '/requests',
          icon: ListMusic,
          badge: activeCount > 0 ? activeCount : null,
          match: ['/requests', '/request'],
        },
        {
          label: 'Profile',
          href: '/profile',
          icon: User,
          match: ['/profile'],
        },
      ]
    : [
        {
          label: 'Connect',
          href: '/',
          icon: QrCode,
          match: ['/'],
        },
        {
          label: 'Sign In',
          href: '/login',
          icon: LogIn,
          match: ['/login'],
        },
      ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav aria-label="Guest Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d131d]/95 backdrop-blur-lg border-t border-[#233044] px-4 py-2 flex items-center justify-around safe-bottom">
        {navItems.map((item) => {
          const isActive = item.match.some((m) =>
            m === '/' ? pathname === '/' : pathname.startsWith(m)
          );
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 relative transition-colors ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 bg-emerald-400 rounded-full mt-0.5" />
              )}
            </Link>
          );
        })}

        {/* Mobile Quick DJ Booth / Login */}
        <Link
          href="/login"
          className={`flex flex-col items-center justify-center py-1 px-3 relative transition-colors ${
            pathname.startsWith('/login') ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LogIn className="w-5 h-5" />
          <span className="text-[11px] mt-1">Booth</span>
        </Link>
      </nav>

      {/* Desktop Header Navigation */}
      <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-[#0d131d]/90 backdrop-blur border-b border-[#233044]">
        <div className="flex items-center gap-8">
          <Link href="/discover" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center border border-white/10 group-hover:scale-105 transition-all">
              <Image
                src="/brand-logo-transparent.png"
                alt="QueMyDJ"
                width={32}
                height={32}
                priority
                className="object-contain p-0.5"
              />
            </div>
            <span className="font-black text-lg text-white tracking-tight group-hover:text-emerald-400 transition-colors">
              QueMyDJ
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.match.some((m) =>
                m === '/' ? pathname === '/' : pathname.startsWith(m)
              );
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#182232] text-emerald-400 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-[#131b26]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="bg-emerald-500 text-black text-xs font-bold px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Guest Club Night Wallet Badge */}
          <Link
            href="/wallet"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14202e] hover:bg-[#1a2c40] border border-[#233852] text-xs transition-all"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 font-medium">Night Wallet:</span>
              <span className="font-extrabold text-emerald-400">
                ₦{currentUser.walletBalance.toLocaleString()}
              </span>
            </div>
          </Link>

          {/* QR Scanner */}
          <Link
            href="/qr-scanner"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#182232] hover:bg-[#1f2c40] border border-[#2c3b52] text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scan QR</span>
          </Link>

          {/* DJ Login Gateway / Booth Link */}
          {currentUser.isRegistered ? (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182232] hover:bg-[#202d42] border border-[#2c3b52] text-xs font-bold text-slate-200 transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-400 text-black flex items-center justify-center text-[10px] font-black">
                {currentUser.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="max-w-[80px] truncate">{currentUser.name}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#182232] hover:bg-[#202d42] border border-[#2c3b52] text-xs font-bold text-slate-200 transition-all"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Sign In</span>
            </Link>
          )}

          <Link
            href="/dj/workstation"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-xs transition-all shadow-md shadow-emerald-500/20"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>DJ Booth</span>
          </Link>
        </div>
      </header>
    </>
  );
};
