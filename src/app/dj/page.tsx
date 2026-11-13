'use client';

import React, { useState } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import {
  Play,
  Pause,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  CheckCheck,
  Sliders,
  Disc3,
  SlidersHorizontal,
  Sun,
  Moon
} from 'lucide-react';
import Link from 'next/link';

export default function DJOverviewMobilePage() {
  const {
    currentDj,
    requests,
    updateDjSessionStatus,
    updateRequestStatus,
    resetDemoData,
    themeMode,
    toggleThemeMode,
  } = useCueApp();

  const session = currentDj.liveSession!;
  const isAccepting = session.isAcceptingRequests;

  const [copiedCode, setCopiedCode] = useState(false);

  const waitingList = requests.filter((r) => r.status === 'waiting');
  const acceptedList = requests.filter((r) => r.status === 'accepted');
  const playingList = requests.filter((r) => r.status === 'playing');
  const playedList = requests.filter((r) => r.status === 'played');

  const activeTrack = playingList[0];

  const totalEarned = requests
    .filter((r) => r.status === 'played' || r.status === 'playing' || r.status === 'accepted')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingRevenue = waitingList.reduce((sum, r) => sum + r.amount, 0);

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(session.passcode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {}
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#0c0d10] text-zinc-950 dark:text-zinc-100 transition-colors">
      {/* 1. STICKY BOOTH CONSOLE HEADER */}
      <header className="px-5 h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0c0d10]/90 backdrop-blur-xl z-20 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={currentDj.avatarUrl}
            alt={currentDj.name}
            className="w-8 h-8 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-zinc-950 dark:text-white tracking-tight truncate leading-tight">
              Booth Console
            </h1>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
              {currentDj.currentVenue.name}
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
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Guest View</span>
          </Link>
        </div>
      </header>

      <main className="px-5 pt-4 pb-6 space-y-5">
        {/* 2. TACTILE BOOTH QR PASS & SESSION TELEMETRY CARD */}
        <section className="rounded-[24px] bg-zinc-950 text-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/[0.08] space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-white/[0.08] text-[12px] font-medium">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAccepting ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                  }`}
                />
                <span className={isAccepting ? 'text-emerald-400' : 'text-zinc-400'}>
                  {isAccepting ? 'Accepting Live Requests' : 'Booth Paused'}
                </span>
              </div>

              <div className="pt-1">
                <span className="text-[12px] text-zinc-400 block">Venue Passcode</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="text-[32px] font-mono font-bold tracking-tight text-white leading-none mt-0.5 flex items-baseline gap-2"
                >
                  <span>{session.passcode}</span>
                  <span className="text-[11px] font-sans font-medium text-emerald-400">
                    {copiedCode ? 'Copied' : 'Tap to copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Link to Settings & QR Poster */}
            <Link
              href="/dj/settings"
              aria-label="Manage Booth QR poster and settings"
              className="h-11 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-300" />
              <span>Booth Poster</span>
            </Link>
          </div>

          {/* 3-Column Financial & Set Telemetry */}
          <div className="pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 tabular-nums">
            <div>
              <span className="text-[11px] text-zinc-400 block">Tonight&apos;s Net</span>
              <span className="text-[18px] font-bold text-white">
                ₦{totalEarned.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block">In Review ({waitingList.length})</span>
              <span className="text-[18px] font-bold text-amber-400">
                +₦{pendingRevenue.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block">Completed</span>
              <span className="text-[18px] font-bold text-emerald-400">
                {playedList.length} tracks
              </span>
            </div>
          </div>

          {/* Action Row: Settings QR Poster + Pause/Resume */}
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/dj/workstation"
              className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[0.99] transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              <Disc3 className="w-4 h-4 animate-spin [animation-duration:5s]" />
              <span>Open Pro DJ Console</span>
            </Link>

            <button
              type="button"
              onClick={() => updateDjSessionStatus(!isAccepting)}
              className={`h-11 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99] ${
                isAccepting
                  ? 'bg-white/10 hover:bg-white/15 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
              }`}
            >
              {isAccepting ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isAccepting ? 'Pause Queue' : 'Resume Queue'}</span>
            </button>
          </div>
        </section>

        {/* 3. NOW SPINNING / ACTIVE DECK STATUS */}
        {activeTrack && (
          <section className="space-y-2.5">
            <h2 className="text-[16px] font-bold tracking-tight text-zinc-950 dark:text-white">
              On Air Now
            </h2>
            <div className="rounded-2xl border border-emerald-500/40 ring-1 ring-emerald-500/15 p-4 bg-white dark:bg-zinc-900 shadow-[0_2px_12px_rgba(16,185,129,0.08)] flex items-center justify-between gap-3 transition-colors">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <img
                  src={activeTrack.song.coverUrl}
                  alt={activeTrack.song.title}
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/[0.06] flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {activeTrack.song.title}
                  </div>
                  <div className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">
                    {activeTrack.song.artist} · {activeTrack.song.bpm} BPM
                  </div>
                  <div className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                    Requested by {activeTrack.guestName} · ₦{activeTrack.amount.toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateRequestStatus(activeTrack.id, 'played')}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold flex items-center gap-1.5 flex-shrink-0 active:scale-95 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>
          </section>
        )}

        {/* 4. UPCOMING REQUESTS PREVIEW */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold tracking-tight text-zinc-950 dark:text-white">
              Pending Approval ({waitingList.length})
            </h2>
            <Link
              href="/dj/queue"
              className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-200 hover:text-zinc-600 dark:hover:text-white inline-flex items-center gap-0.5"
            >
              <span>Open Queue</span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
          </div>

          {waitingList.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.06] dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-5 text-center space-y-2 transition-colors">
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">All incoming requests have been reviewed.</p>
              <button
                type="button"
                onClick={resetDemoData}
                className="h-8 px-3.5 rounded-full bg-zinc-950 dark:bg-zinc-800 text-white text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Queue</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-black/[0.07] dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors">
              {waitingList.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={req.song.coverUrl}
                      alt={req.song.title}
                      className="w-11 h-11 rounded-xl object-cover ring-1 ring-black/[0.06] flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {req.song.title}
                      </div>
                      <div className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">
                        {req.song.artist} · {req.guestName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[14px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +₦{req.amount.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, 'accepted')}
                      className="h-8 px-3 rounded-lg bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-800 text-white text-[12px] font-semibold active:scale-95 cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 5. BOOTH MANAGEMENT LINKS */}
        <div className="rounded-2xl border border-black/[0.07] dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors">
          <Link
            href="/dj/workstation"
            className="p-4 flex items-center justify-between text-[15px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Full Desktop DJ Console (Pioneer / Serato Mode)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </Link>

          <Link
            href="/dj/queue"
            className="p-4 flex items-center justify-between text-[15px] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-medium transition-colors"
          >
            <span>Mobile Queue Controller ({waitingList.length + acceptedList.length} active)</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </Link>

          <Link
            href="/dj/earnings"
            className="p-4 flex items-center justify-between text-[15px] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-medium transition-colors"
          >
            <span>Payouts & Transaction Ledger</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </Link>

          <Link
            href="/dj/settings"
            className="p-4 flex items-center justify-between text-[15px] text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 font-medium transition-colors"
          >
            <span>Booth Profile, QR Poster & Rates</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </Link>
        </div>
      </main>
    </div>
  );
}
