'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import { QrCode, Radio, Disc3, RotateCcw } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { userRole, setUserRole, resetDemoData } = useCueApp();

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-xs">
            <Image
              src="/brand-logo-transparent.png"
              alt="QueMyDJ"
              width={32}
              height={32}
              priority
              className="object-contain p-0.5"
            />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-gray-900 group-hover:text-emerald-600 transition-colors">
            QueMyDJ
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/'
                ? 'bg-gray-100 text-gray-900 font-semibold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Scan & Queue
          </Link>

          <Link
            href="/events"
            className={`px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/events'
                ? 'bg-gray-100 text-gray-900 font-semibold'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            DJs Around
          </Link>

          <Link
            href="/dj/queue"
            className={`px-3 py-1.5 rounded-md transition-colors ${
              pathname.startsWith('/dj')
                ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            DJ Booth
          </Link>

          <button
            onClick={() => {
              if (confirm('Reset requests back to initial demo list?')) {
                resetDemoData();
              }
            }}
            title="Reset sample data"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
};
