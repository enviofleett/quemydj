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
  ArrowDownLeft
} from 'lucide-react';

export default function VenueOwnerMobilePortal() {
  const { venues, activeVenue, setActiveVenueId, requests, djs } = useCueApp();

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
    <div className="flex flex-col flex-1 bg-zinc-950 text-white min-h-[100dvh] pb-24 select-none">
      {/* 1. TOP STATUS BAR & VENUE SELECTOR */}
      <header className="px-5 pt-4 pb-3 border-b border-white/[0.08] sticky top-0 bg-zinc-950/90 backdrop-blur-xl z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 block">
                Venue Portal
              </span>
              <h1 className="text-sm font-bold text-white leading-tight truncate max-w-[190px]">
                {activeVenue.name}
              </h1>
            </div>
          </div>

          {/* Quick venue switcher dropdown if multiple clubs */}
          <select
            value={activeVenue.id}
            onChange={(e) => setActiveVenueId(e.target.value)}
            className="bg-zinc-900 border border-white/15 text-xs text-zinc-300 font-semibold px-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.city} &bull; {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Filter Capsule */}
        <div className="grid grid-cols-3 p-1 bg-zinc-900 rounded-xl mt-3 border border-white/[0.06]">
          {[
            { id: 'overview', label: 'Live Spend' },
            { id: 'sessions', label: 'DJ Performance' },
            { id: 'payouts', label: 'Bank Settlement' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* 2. TAB CONTENT */}
      <main className="px-5 pt-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* TONIGHT'S LIVE REVENUE HERO CARD */}
            <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-emerald-950/60 via-zinc-900 to-zinc-900 border border-emerald-500/30 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Tonight&apos;s Club Commission
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeVenue.commissionSplit.venuePercentage}% Split
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <h2 className="text-3xl font-black tracking-tight text-white tabular-nums">
                  ₦{venueCut.toLocaleString()}
                </h2>
                <span className="text-xs text-zinc-400 font-medium">earned tonight</span>
              </div>

              {/* Total Room Spend & Payout Split Chips */}
              <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white/[0.04]">
                  <span className="text-[10px] text-zinc-400 block font-medium">Gross Room Spend</span>
                  <span className="text-xs font-bold text-white tabular-nums">
                    ₦{totalGrossSpend.toLocaleString()}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white/[0.04]">
                  <span className="text-[10px] text-zinc-400 block font-medium">DJ Payout ({activeVenue.commissionSplit.djPercentage}%)</span>
                  <span className="text-xs font-bold text-sky-400 tabular-nums">
                    ₦{djCut.toLocaleString()}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white/[0.04]">
                  <span className="text-[10px] text-zinc-400 block font-medium">Platform ({activeVenue.commissionSplit.platformPercentage}%)</span>
                  <span className="text-xs font-bold text-zinc-400 tabular-nums">
                    ₦{platformFee.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* LIVE RESIDENT DJ IN THE BUILDING */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Active Resident DJ
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  On Deck
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={activeDj.avatarUrl}
                  alt={activeDj.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate">{activeDj.name}</h3>
                  <p className="text-xs text-zinc-400 truncate">{activeDj.handle} &bull; Passcode: {activeDj.liveSession?.passcode || 'SKY99'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white tabular-nums block">
                    ₦{(activeDj.liveSession?.basePrice || 5000).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">base/song</span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                <span>Accepted: <strong className="text-white">{acceptedCount}</strong> tracks</span>
                <span>Queue Volume: <strong className="text-white">{venueRequests.length}</strong> submitted</span>
                <span>Fulfillment: <strong className="text-emerald-400">{venueRequests.length > 0 ? Math.round((acceptedCount / venueRequests.length) * 100) : 100}%</strong></span>
              </div>
            </div>

            {/* LIVE TABLE REQUESTS STREAM */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Live Table Requests Feed
              </span>

              {venueRequests.length === 0 ? (
                <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/[0.06] text-center text-xs text-zinc-500">
                  No song requests placed yet tonight. Guests will appear as they scan table QR codes.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06] rounded-2xl bg-zinc-900 border border-white/[0.08] overflow-hidden">
                  {venueRequests.map((req) => (
                    <div key={req.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{req.song.title}</span>
                          <span className="text-[10px] text-zinc-400">{req.song.artist}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                          Guest: <strong className="text-zinc-300">{req.guestName}</strong> &bull; {req.status.toUpperCase()}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-white tabular-nums block">
                          ₦{req.total.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold">
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
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08] space-y-2.5">
              <h3 className="text-sm font-bold text-white">DJ Rotation & Performance</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Review the performers scheduled at {activeVenue.name} and their guest satisfaction metrics.
              </p>
            </div>

            <div className="divide-y divide-white/[0.06] rounded-2xl bg-zinc-900 border border-white/[0.08] overflow-hidden">
              {djs.map((dj) => (
                <div key={dj.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={dj.avatarUrl} alt={dj.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{dj.name}</h4>
                      <p className="text-[11px] text-zinc-400">{dj.genres.slice(0, 2).join(', ')}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-400 block">★ {dj.rating}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{dj.totalSets} club sets</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-4">
            {/* BANK ACCOUNT CARD */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/[0.12] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Settlement Account
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              </div>

              <div>
                <span className="text-lg font-black text-white block tracking-wider">
                  {activeVenue.bankDetails.accountNumber}
                </span>
                <p className="text-xs text-zinc-300 font-semibold mt-0.5">
                  {activeVenue.bankDetails.accountName}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {activeVenue.bankDetails.bankName}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                <span>Daily Payout Window:</span>
                <span className="text-white font-bold">6:00 AM Sweep</span>
              </div>
            </div>

            {/* LIFETIME METRICS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08]">
                <span className="text-[11px] text-zinc-400 block font-medium">All-Time GMV</span>
                <span className="text-base font-bold text-white tabular-nums mt-1 block">
                  ₦{activeVenue.totalRevenueGenerated.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08]">
                <span className="text-[11px] text-zinc-400 block font-medium">Total Club Cut Paid</span>
                <span className="text-base font-bold text-emerald-400 tabular-nums mt-1 block">
                  ₦{activeVenue.totalCommissionPaid.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QUICK FOOTER NAVIGATION FOR VENUE MANAGER */}
      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-14 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-between text-xs z-30">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          &larr; Guest View
        </Link>
        <Link href="/admin" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
          Super-Admin Console &rarr;
        </Link>
      </footer>
    </div>
  );
}
