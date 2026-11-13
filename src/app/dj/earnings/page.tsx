'use client';

import React from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { TrendingUp, CreditCard, ArrowLeft, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

export default function DJEarningsMobilePage() {
  const { requests, currentDj, themeMode, toggleThemeMode } = useCueApp();

  const paidRequests = requests.filter(
    (r) => r.status === 'played' || r.status === 'playing' || r.status === 'accepted'
  );

  const totalNet = paidRequests.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#0c0d10] text-zinc-950 dark:text-zinc-100 transition-colors">
      {/* Sticky Native Header with Back Button */}
      <header className="px-5 h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0c0d10]/90 backdrop-blur-xl z-20 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dj"
            aria-label="Back to booth console"
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center flex-shrink-0 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-zinc-950 dark:text-white tracking-tight truncate leading-tight">
              Earnings & Payouts
            </h1>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
              {currentDj.name} · {currentDj.currentVenue.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleThemeMode}
            title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4 text-indigo-600" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <Link
            href="/"
            className="h-8 px-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-[12px] font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <span>Guest View</span>
          </Link>
        </div>
      </header>

      <main className="px-5 pt-4 pb-6 space-y-5">
        {/* Cash App-Style Balance Card */}
      <div className="rounded-2xl border border-black/[0.07] dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2 transition-colors">
        <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 block">
          Tonight&apos;s Balance
        </span>
        <div className="text-[34px] font-bold tracking-tight text-zinc-950 dark:text-white tabular-nums leading-none">
          ₦{totalNet.toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-emerald-700 dark:text-emerald-400 font-medium pt-1 tabular-nums">
          <TrendingUp className="w-4 h-4" />
          <span>{paidRequests.length} authorized song requests</span>
        </div>
      </div>

      {/* Connected Bank Account Card */}
      <div className="rounded-2xl border border-black/[0.07] dark:border-zinc-800 p-4 flex items-center justify-between bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 block">
              Chase Business Checking
            </span>
            <span className="text-[13px] text-zinc-500 dark:text-zinc-400 tabular-nums">
              •••• 8831 · Instant Payouts
            </span>
          </div>
        </div>
        <span className="h-6 px-2.5 rounded-full text-[12px] font-medium bg-emerald-500/12 text-emerald-800 dark:text-emerald-400 inline-flex items-center">
          Active
        </span>
      </div>

      {/* Itemized Transactions */}
      <div className="space-y-2.5">
        <h2 className="text-[16px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Recent Activity
        </h2>

        {paidRequests.length === 0 ? (
          <p className="text-[13px] text-zinc-400 py-6 text-center">No transactions yet tonight.</p>
        ) : (
          <div className="rounded-2xl border border-black/[0.07] dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors">
            {paidRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {req.song.title}
                  </div>
                  <div className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {req.guestName} · {req.paidVia}
                  </div>
                </div>
                <div className="text-[15px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums flex-shrink-0">
                  +₦{req.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
