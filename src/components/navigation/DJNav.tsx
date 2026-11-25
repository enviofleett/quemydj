'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Layers,
  Radio,
  Sliders,
  Wallet,
  Settings,
  Disc3,
  CircleDot,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';

export const DJNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentDj, requests, themeMode, toggleThemeMode, logoutDj } = useCueApp();

  const waitingCount = requests.filter((r) => r.status === 'waiting').length;
  const isLive = currentDj.liveSession?.isAcceptingRequests ?? false;

  const navLinks = [
    {
      label: 'Workstation',
      href: '/dj/workstation',
      icon: Layers,
      badge: waitingCount > 0 ? waitingCount : null,
      highlight: true,
    },
  ];

  return (
    <>
      {/* Mobile Bottom DJ Nav */}
      <nav aria-label="DJ Workspace Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0a0e17]/95 backdrop-blur-xl border-t border-zinc-200 dark:border-[#1e293b] px-3 py-2 flex items-center justify-around safe-bottom transition-colors">
        {navLinks.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 relative transition-colors ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop DJ Workspace Header */}
      <header className="hidden md:flex items-center justify-between px-8 py-3 bg-white dark:bg-[#0a0e17] border-b border-zinc-200 dark:border-[#1e293b] transition-colors">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Link href="/dj/workstation" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center border border-zinc-700/50 group-hover:scale-105 transition-all">
                <Image
                  src="/brand-logo-transparent.png"
                  alt="QueMyDJ"
                  width={32}
                  height={32}
                  priority
                  className="object-contain p-0.5"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg text-zinc-950 dark:text-white tracking-tight leading-tight">
                  QueMyDJ
                </span>
                <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider -mt-0.5">
                  Powered by Zenbeatz
                </span>
              </div>
            </Link>
            <div className="h-5 w-px bg-zinc-200 dark:bg-[#1e293b]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight text-zinc-950 dark:text-white">DJ Booth</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Live
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-slate-400">
                <span>{currentDj.name}</span>
                <span>•</span>
                <span className="text-zinc-700 dark:text-slate-300">{currentDj.currentVenue.name}</span>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-[#1e293b] text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'text-zinc-600 dark:text-slate-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-[#131b26]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="bg-amber-400 text-black text-xs font-black px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Live Status indicator & Theme Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleThemeMode}
            title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4 text-indigo-600" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${
            isLive 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-400' 
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-400'
          }`}>
            <CircleDot className={`w-3.5 h-3.5 ${isLive ? 'text-emerald-500 animate-ping' : 'text-rose-500'}`} />
            <span>{isLive ? 'ACCEPTING REQUESTS' : 'REQUESTS PAUSED'}</span>
          </div>

          <Link
            href="/djs/dj-kofi"
            target="_blank"
            className="text-xs text-zinc-500 dark:text-slate-400 hover:text-zinc-900 dark:hover:text-slate-200 underline decoration-zinc-400 dark:decoration-slate-600 underline-offset-4"
          >
            Preview Guest View ↗
          </Link>

          <button
            type="button"
            onClick={() => {
              logoutDj();
              router.push('/login');
            }}
            title="Sign out of DJ Booth"
            className="px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>
    </>
  );
};
