'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCueApp } from '@/context/CueAppContext';
import {
  Building2,
  DollarSign,
  Music,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Landmark,
  Calendar,
  Users,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowDownLeft,
  Moon,
  Sun,
  Sliders,
  Check,
  Headphones,
  ArrowLeft
} from 'lucide-react';

export default function VenueOwnerPortalPage() {
  const { venues, activeVenue, setActiveVenueId, requests, djs, themeMode, toggleThemeMode } = useCueApp();

  // Find active resident DJ for this venue (with robust fallback)
  const activeDj =
    djs.find((d) => d.id === activeVenue.activeDjId) ||
    djs[0] || {
      id: 'dj-fallback',
      name: 'Resident DJ',
      handle: '@resident',
      avatarUrl:
        'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=300&auto=format&fit=crop&q=80',
      liveSession: {
        id: 'session-skyline',
        passcode: 'SKY99',
        basePrice: 5000,
      },
    };

  // Requests belonging to this venue
  const venueRequests = requests.filter(
    (r) => r.venueName.toLowerCase().includes(activeVenue.name.toLowerCase()) || r.djId === activeDj.id
  );

  // Financial calculations
  const totalGrossSpend = venueRequests.reduce((acc, r) => acc + (r.total || 0), 0);
  const venueCut = Math.round(totalGrossSpend * (activeVenue.commissionSplit.venuePercentage / 100));
  const djCut = Math.round(totalGrossSpend * (activeVenue.commissionSplit.djPercentage / 100));
  const platformFee = Math.round(totalGrossSpend * (activeVenue.commissionSplit.platformPercentage / 100));

  const acceptedCount = venueRequests.filter(
    (r) => r.status === 'accepted' || r.status === 'playing' || r.status === 'played'
  ).length;

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'payouts'>('overview');

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#0c0d10] text-zinc-950 dark:text-zinc-100 min-h-[100dvh] transition-colors duration-200">
      {/* 1. STICKY BOOTH HEADER (Identical to DJ Queue header styling) */}
      <header className="px-5 h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0c0d10]/90 backdrop-blur-xl z-20 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            aria-label="Back to home"
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[16px] font-bold text-zinc-950 dark:text-white tracking-tight truncate leading-tight">
                {activeVenue.name}
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate leading-tight mt-0.5">
              Club Host Portal • {activeVenue.city}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Quick venue switcher dropdown if multiple clubs */}
          <select
            value={activeVenue.id}
            onChange={(e) => setActiveVenueId(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold px-2 py-1.5 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.city} • {v.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleThemeMode}
            title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4 text-zinc-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>
      </header>

      {/* 2. NATIVE SEGMENTED TABS (Identical to DJ Queue / User Dashboard tabs) */}
      <div className="px-5 pt-3 pb-1">
        <div
          role="tablist"
          className="grid grid-cols-3 p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800/80 rounded-xl"
        >
          {[
            { id: 'overview', label: 'Live Spend' },
            { id: 'sessions', label: 'Resident DJs' },
            { id: 'payouts', label: 'Settlement' },
          ].map((tab) => {
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`h-8 rounded-[9px] text-[12px] tabular-nums transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      <main className="px-5 pt-3 pb-24 space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* ATMOSPHERIC EDITORIAL HERO BANNER (Matches Guest & DJ console full-bleed style) */}
            <section className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-white flex flex-col justify-between p-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] min-h-[300px]">
              {/* Full-bleed atmospheric club photography */}
              <div
                className="absolute inset-0 bg-cover bg-center scale-105 pointer-events-none"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop')`,
                }}
              />
              {/* Balanced top & bottom editorial vignette */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/40 to-zinc-950/95 pointer-events-none" />

              {/* Top Bar with Live Tag and Split Pill */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-zinc-950/70 backdrop-blur-md border border-white/15 text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Tonight&apos;s Club Commission</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-300 font-semibold bg-zinc-950/70 backdrop-blur-md border border-white/15 px-2.5 py-1 rounded-full">
                  {activeVenue.commissionSplit.venuePercentage}% Split
                </span>
              </div>

              {/* Bottom Anchor: Large Host Earnings + 3-way Split Grid */}
              <div className="relative z-10 space-y-3.5 mt-8">
                <div>
                  <div className="text-[11px] text-zinc-300 uppercase tracking-wider font-mono font-medium">
                    Club Host Earnings
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight tabular-nums mt-0.5">
                    ₦{venueCut.toLocaleString()}
                  </div>
                </div>

                {/* Translucent Frosted Glass Split Breakdown */}
                <div className="pt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] text-zinc-400 block font-medium">Gross Room Spend</span>
                    <span className="text-xs font-bold text-white tabular-nums mt-0.5 block">
                      ₦{totalGrossSpend.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] text-zinc-400 block font-medium">DJ Share ({activeVenue.commissionSplit.djPercentage}%)</span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums mt-0.5 block">
                      ₦{djCut.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] text-zinc-400 block font-medium">Platform ({activeVenue.commissionSplit.platformPercentage}%)</span>
                    <span className="text-xs font-bold text-zinc-300 tabular-nums mt-0.5 block">
                      ₦{platformFee.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* LIVE RESIDENT DJ IN THE BUILDING */}
            <div className="rounded-2xl p-4 bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Active Resident DJ
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  On Deck
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-700 dark:from-zinc-800 dark:to-zinc-600 flex items-center justify-center text-white font-bold text-sm ring-1 ring-black/[0.06] dark:ring-white/10 flex-shrink-0 shadow-sm">
                  {activeDj.name?.replace(/DJ\s*/i, '').slice(0, 2).toUpperCase() || 'DJ'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">{activeDj.name}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {activeDj.handle} • Booth Code: <strong className="text-zinc-900 dark:text-white font-mono">{activeDj.liveSession?.passcode || 'SKY99'}</strong>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums block">
                    ₦{(activeDj.liveSession?.basePrice || 5000).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">base/song</span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Accepted: <strong className="text-zinc-900 dark:text-white">{acceptedCount}</strong></span>
                <span>Queue: <strong className="text-zinc-900 dark:text-white">{venueRequests.length}</strong></span>
                <span>Fulfillment: <strong className="text-emerald-600 dark:text-emerald-400">{venueRequests.length > 0 ? Math.round((acceptedCount / venueRequests.length) * 100) : 100}%</strong></span>
              </div>
            </div>

            {/* LIVE TABLE REQUESTS STREAM */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Live Table Requests Stream
                </span>
                <span className="text-xs text-zinc-400 font-medium tabular-nums">
                  {venueRequests.length} total
                </span>
              </div>

              {venueRequests.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/60 border border-black/[0.06] dark:border-zinc-800/80 text-center text-xs text-zinc-500">
                  No song requests placed yet tonight. Guests will appear in real time as they scan table QR codes.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
                  {venueRequests.map((req) => (
                    <div key={req.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">{req.song.title}</span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">• {req.song.artist}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          Guest: <strong className="text-zinc-800 dark:text-zinc-200">{req.guestName}</strong> • <span className="uppercase text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{req.status}</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums block">
                          ₦{req.total.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          +₦{Math.round(req.total * (activeVenue.commissionSplit.venuePercentage / 100)).toLocaleString()} club cut
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Resident DJ Roster</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Review performers scheduled at {activeVenue.name} and their guest satisfaction ratings.
              </p>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
              {djs.map((dj) => (
                <div key={dj.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-600 flex items-center justify-center text-white font-bold text-xs ring-1 ring-black/[0.06] dark:ring-white/10 flex-shrink-0">
                      {dj.name?.replace(/DJ\s*/i, '').slice(0, 2).toUpperCase() || 'DJ'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{dj.name}</h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{dj.genres.slice(0, 2).join(', ') || 'Afrobeats, Amapiano'}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-500 block">★ {dj.rating || '5.0'}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{dj.totalSets || 12} sets</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-4">
            {/* BANK ACCOUNT CARD */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Settlement Account
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Payout Rail
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">GTBank Nigeria •••• 9104</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Automated settlement every Monday 06:00 AM WAT</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* COMMISSION SPLIT AGREEMENT */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-black/[0.08] dark:border-zinc-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Multi-Party Split Configuration
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Club Venue Cut</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{activeVenue.commissionSplit.venuePercentage}%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">Resident DJ Payout</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeVenue.commissionSplit.djPercentage}%</span>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400">QueMyDJ Platform Maintenance</span>
                  <span className="font-bold text-zinc-500">{activeVenue.commissionSplit.platformPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. BOTTOM NAVIGATION BAR (Aligned with DJ Queue & Guest Nav) */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white/95 dark:bg-[#0c0d10]/95 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 h-16 px-6 flex items-center justify-around z-30">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
            activeTab === 'overview' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span>Live Spend</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
            activeTab === 'sessions' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <Headphones className="w-5 h-5" />
          <span>DJs</span>
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
            activeTab === 'payouts' ? 'text-zinc-950 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`}
        >
          <Landmark className="w-5 h-5" />
          <span>Settlement</span>
        </button>

        <Link
          href="/login"
          className="flex flex-col items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
        >
          <Users className="w-5 h-5" />
          <span>Switch</span>
        </Link>
      </footer>
    </div>
  );
}
