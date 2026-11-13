'use client';

import React, { useState } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { SongRequest } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Drawer } from 'vaul';
import {
  Play,
  CheckCheck,
  Layers,
  ArrowLeft,
  Check,
  RotateCcw,
  Sliders,
  ExternalLink,
  Volume2,
  VolumeX,
  Sun,
  Moon
} from 'lucide-react';
import Link from 'next/link';

export default function DJQueueMobilePage() {
  const {
    currentDj,
    requests,
    updateRequestStatus,
    updateDjSessionStatus,
    resetDemoData,
    themeMode,
    toggleThemeMode,
  } = useCueApp();

  const session = currentDj.liveSession;
  const isAccepting = session?.isAcceptingRequests ?? false;

  const [activeTab, setActiveTab] = useState<'waiting' | 'accepted' | 'playing' | 'played'>(
    'waiting'
  );
  const [selectedDecline, setSelectedDecline] = useState<SongRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('Vibe mismatch for current set');
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const audioBoothRef = React.useRef<HTMLAudioElement | null>(null);

  const toggleBoothPreview = (req: SongRequest) => {
    if (!req.song.previewUrl) return;

    if (playingPreviewId === req.id) {
      if (audioBoothRef.current) audioBoothRef.current.pause();
      setPlayingPreviewId(null);
    } else {
      if (audioBoothRef.current) audioBoothRef.current.pause();
      const a = new Audio(req.song.previewUrl);
      audioBoothRef.current = a;
      a.play().catch(() => {});
      setPlayingPreviewId(req.id);
      a.onended = () => setPlayingPreviewId(null);
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioBoothRef.current) audioBoothRef.current.pause();
    };
  }, []);

  const waitingList = requests.filter((r) => r.status === 'waiting');
  const acceptedList = requests.filter((r) => r.status === 'accepted');
  const playingList = requests.filter((r) => r.status === 'playing');
  const playedList = requests.filter((r) => r.status === 'played');

  const activeTrack = playingList[0];

  const tonightEarned = requests
    .filter((r) => r.status === 'played' || r.status === 'playing' || r.status === 'accepted')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingPayout = waitingList.reduce((sum, r) => sum + r.amount, 0);

  const handleConfirmDecline = () => {
    if (!selectedDecline) return;
    updateRequestStatus(selectedDecline.id, 'declined', declineReason);
    setSelectedDecline(null);
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#0c0d10] text-zinc-950 dark:text-zinc-100 transition-colors">
      {/* 1. STICKY BOOTH HEADER */}
      <header className="px-5 h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0c0d10]/90 backdrop-blur-xl z-20 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            aria-label="Back to guest app"
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-zinc-950 dark:text-white tracking-tight truncate leading-tight">
              {currentDj.name}
            </h1>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
              {currentDj.currentVenue.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
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
            href="/dj/settings"
            aria-label="Booth settings and QR code"
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => updateDjSessionStatus(!isAccepting)}
            className={`h-8 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors active:scale-95 ${
              isAccepting
                ? 'bg-emerald-500/12 text-emerald-800'
                : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isAccepting ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
              }`}
            />
            <span>{isAccepting ? 'Booth Open' : 'Paused'}</span>
          </button>
        </div>
      </header>

      <main className="px-5 pt-4 pb-6 space-y-5">
        {/* 2. LIVE BOOTH DECK CONSOLE CARD (Tactile Pioneer / Sonos Hardware Module) */}
        <section className="rounded-[24px] bg-zinc-950 text-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/[0.08] space-y-4">
          {/* Top Row: Live Deck Indicator + Booth Passcode */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-white/[0.08] text-[12px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeTrack ? 'On Air Now' : 'Deck Standby'}</span>
            </span>

            <Link
              href="/dj/settings"
              className="inline-flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-white transition-colors"
            >
              <span>Booth Code</span>
              <span className="font-mono font-semibold text-white bg-white/10 px-2 py-0.5 rounded-md">
                {session?.passcode || 'SKY99'}
              </span>
            </Link>
          </div>

          {/* Active Deck Track Display */}
          {activeTrack ? (
            <div className="flex items-center justify-between gap-3.5 pt-0.5">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <img
                  src={activeTrack.song.coverUrl}
                  alt={activeTrack.song.title}
                  className="w-13 h-13 rounded-xl object-cover ring-1 ring-white/15 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-bold text-white truncate leading-snug">
                    {activeTrack.song.title}
                  </h2>
                  <p className="text-[13px] text-zinc-400 truncate mt-0.5">
                    {activeTrack.song.artist}
                  </p>
                  <div className="flex items-center gap-2 text-[12px] text-zinc-400 mt-1 tabular-nums">
                    <span className="text-emerald-400 font-medium">
                      {activeTrack.song.bpm} BPM
                    </span>
                    <span>·</span>
                    <span className="truncate">For {activeTrack.guestName}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateRequestStatus(activeTrack.id, 'played')}
                className="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[12px] font-bold flex items-center gap-1.5 flex-shrink-0 transition-colors active:scale-95"
              >
                <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Finish</span>
              </button>
            </div>
          ) : (
            <div className="py-2 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-white">
                  No track marked on air
                </h2>
                <p className="text-[13px] text-zinc-400 mt-0.5">
                  Cue an approved request below to notify the guest
                </p>
              </div>
              {acceptedList.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateRequestStatus(acceptedList[0].id, 'playing')}
                  className="h-9 px-3.5 rounded-xl bg-white text-zinc-950 text-[12px] font-semibold flex-shrink-0 active:scale-95"
                >
                  Cue Next
                </button>
              )}
            </div>
          )}

          {/* Hairline Telemetry Strip */}
          <div className="pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 tabular-nums">
            <div>
              <span className="text-[11px] text-zinc-400 block">Pending Payout</span>
              <span className="text-[16px] font-bold text-amber-400">
                ₦{pendingPayout.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block">Tonight&apos;s Net</span>
              <span className="text-[16px] font-bold text-white">
                ₦{tonightEarned.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block">Track Rate</span>
              <span className="text-[16px] font-bold text-zinc-300">
                ₦{(session?.basePrice || 5000).toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* 3. NATIVE SEGMENTED QUEUE CONTROLLER */}
        <div
          role="tablist"
          aria-label="DJ Queue Filter"
          className="grid grid-flow-col auto-cols-fr p-1 bg-zinc-100 rounded-xl"
        >
          {[
            { id: 'waiting', label: `Review (${waitingList.length})` },
            { id: 'accepted', label: `Queued (${acceptedList.length})` },
            { id: 'playing', label: `Live (${playingList.length})` },
            { id: 'played', label: `History (${playedList.length})` },
          ].map((tab) => {
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`h-8 rounded-[9px] text-[12px] tabular-nums transition-all flex items-center justify-center truncate px-1 ${
                  isCurrent
                    ? 'bg-white text-zinc-950 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                    : 'text-zinc-500 font-medium hover:text-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 4. QUEUE CARDS */}
        {activeTab === 'waiting' && (
          <div className="space-y-3">
            {waitingList.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.06] bg-zinc-50/60 p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-zinc-200/70 text-zinc-600 flex items-center justify-center mx-auto">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-zinc-900">
                  Review queue is clear
                </h3>
                <p className="text-[13px] text-zinc-500 max-w-[230px] mx-auto">
                  New guest requests will appear here with instant payout authorization.
                </p>
                <button
                  type="button"
                  onClick={resetDemoData}
                  className="mt-2 h-9 px-4 rounded-full bg-zinc-950 text-white text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load Sample Requests</span>
                </button>
              </div>
            ) : (
              waitingList.map((req) => (
                <article
                  key={req.id}
                  className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3"
                >
                  {/* 3-Column Native Track Row with Cover Artwork & BPM */}
                  <div className="flex items-start gap-3.5">
                    <img
                      src={req.song.coverUrl}
                      alt={req.song.title}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/[0.06] flex-shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-zinc-900 truncate leading-snug">
                        {req.song.title}
                      </h3>
                      <p className="text-[13px] text-zinc-500 truncate mt-0.5">
                        {req.song.artist}
                      </p>
                      <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mt-1 tabular-nums">
                        <span className="font-medium text-zinc-700">{req.song.bpm} BPM</span>
                        <span>·</span>
                        <span>{req.song.genre}</span>
                        <span>·</span>
                        <span className="truncate">{req.guestName}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[16px] font-bold text-emerald-600 tabular-nums">
                        +₦{req.amount.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-400">
                        {req.paidVia}
                      </span>
                    </div>
                  </div>

                  {req.guestNote && (
                    <p className="text-[13px] text-zinc-600 leading-snug">
                      &ldquo;{req.guestNote}&rdquo;
                    </p>
                  )}

                  {/* Hairline-Separated Action Row with Audio Preview & External Links */}
                  <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {req.song.previewUrl && (
                        <button
                          type="button"
                          onClick={() => toggleBoothPreview(req)}
                          className="h-8 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          {playingPreviewId === req.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-red-600" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Preview</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* One-click open in YouTube or Serato/Streaming search */}
                      <a
                        href={req.song.externalUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(req.song.title + ' ' + req.song.artist)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Open YT/Stream</span>
                        <ExternalLink className="w-3 h-3 text-zinc-400" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDecline(req)}
                        className="h-8 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 text-[12px] font-semibold transition-colors active:scale-[0.99]"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRequestStatus(req.id, 'accepted')}
                        className="h-8 px-3.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-[12px] font-semibold transition-colors active:scale-[0.99] tabular-nums"
                      >
                        Accept · ₦{req.amount.toLocaleString()}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Accepted / Queued */}
        {activeTab === 'accepted' && (
          <div className="space-y-3">
            {acceptedList.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.06] bg-zinc-50/60 p-8 text-center text-[13px] text-zinc-500">
                No approved songs in the queue.
              </div>
            ) : (
              acceptedList.map((req) => (
                <article
                  key={req.id}
                  className="rounded-2xl border border-black/[0.07] p-4 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={req.song.coverUrl}
                      alt={req.song.title}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/[0.06] flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-zinc-900 truncate">
                        {req.song.title}
                      </h3>
                      <p className="text-[13px] text-zinc-500 truncate mt-0.5">
                        {req.song.artist}
                      </p>
                      <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mt-1 tabular-nums">
                        <span className="font-medium text-zinc-700">{req.song.bpm} BPM</span>
                        <span>·</span>
                        <span>For {req.guestName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[15px] font-semibold text-zinc-900 tabular-nums">
                        ₦{req.amount.toLocaleString()}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, 'playing')}
                      className="w-full h-10 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99]"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Cue on Deck (Mark Now Playing)</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Playing */}
        {activeTab === 'playing' && (
          <div className="space-y-3">
            {playingList.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.06] bg-zinc-50/60 p-8 text-center text-[13px] text-zinc-500">
                No track currently marked as playing.
              </div>
            ) : (
              playingList.map((req) => (
                <article
                  key={req.id}
                  className="rounded-2xl border border-emerald-500/40 ring-1 ring-emerald-500/15 bg-white p-4 shadow-[0_2px_12px_rgba(16,185,129,0.08)] space-y-3"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={req.song.coverUrl}
                      alt={req.song.title}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/[0.06] flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-semibold text-zinc-900 truncate">
                        {req.song.title}
                      </h3>
                      <p className="text-[13px] text-zinc-500 truncate mt-0.5">
                        {req.song.artist}
                      </p>
                      <p className="text-[12px] text-zinc-400 mt-1 tabular-nums">
                        {req.song.bpm} BPM · For <span className="text-zinc-700 font-medium">{req.guestName}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[15px] font-semibold text-zinc-900 tabular-nums">
                        ₦{req.amount.toLocaleString()}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, 'played')}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.99]"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Complete & Capture Payout</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Played History */}
        {activeTab === 'played' && (
          <div>
            {playedList.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.06] bg-zinc-50/60 p-8 text-center text-[13px] text-zinc-500">
                No tracks completed yet tonight.
              </div>
            ) : (
              <div className="rounded-2xl border border-black/[0.07] divide-y divide-zinc-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                {playedList.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={req.song.coverUrl}
                        alt={req.song.title}
                        className="w-10 h-10 rounded-lg object-cover ring-1 ring-black/[0.06] flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold text-zinc-900 truncate">
                          {req.song.title}
                        </div>
                        <div className="text-[13px] text-zinc-500 truncate mt-0.5">
                          {req.song.artist} · {req.guestName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 tabular-nums">
                      <span className="text-[15px] font-semibold text-emerald-700 block">
                        +₦{req.amount.toLocaleString()}
                      </span>
                      <span className="text-[12px] text-zinc-400">
                        {new Date(req.updatedAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: 'UTC',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Native Vaul Sheet for Declining a Request */}
      <Drawer.Root
        open={Boolean(selectedDecline)}
        onOpenChange={(open) => {
          if (!open) setSelectedDecline(null);
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50" />
          <Drawer.Content
            aria-labelledby="decline-sheet-title"
            className="bg-white flex flex-col rounded-t-[28px] fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 focus:outline-none shadow-2xl"
          >
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 bg-zinc-300 rounded-full" />
            </div>

            {selectedDecline && (
              <div className="p-5 pb-8 space-y-4">
                <div>
                  <Drawer.Title
                    id="decline-sheet-title"
                    className="text-[18px] font-bold text-zinc-950 tracking-tight"
                  >
                    Decline & Refund Request
                  </Drawer.Title>
                  <p className="text-[13px] text-zinc-500 mt-1">
                    Declining &ldquo;{selectedDecline.song.title}&rdquo; will immediately release the{' '}
                    <span className="font-semibold text-zinc-800 tabular-nums">
                      ₦{selectedDecline.total.toLocaleString()}
                    </span>{' '}
                    hold back to {selectedDecline.guestName}.
                  </p>
                </div>

                <div className="rounded-2xl border border-black/[0.07] divide-y divide-zinc-100 overflow-hidden">
                  {[
                    'Vibe mismatch for current set',
                    'Track already played earlier',
                    'Tempo outside current mix',
                    'Venue music policy',
                  ].map((reason) => {
                    const isSelected = declineReason === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setDeclineReason(reason)}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left text-[14px] text-zinc-900 hover:bg-zinc-50 transition-colors"
                      >
                        <span className={isSelected ? 'font-semibold' : 'font-normal'}>
                          {reason}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isSelected
                              ? 'bg-zinc-950 text-white'
                              : 'border border-zinc-300 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDecline(null)}
                    className="h-11 rounded-xl bg-zinc-100 text-[14px] font-semibold text-zinc-800 hover:bg-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDecline}
                    className="h-11 rounded-xl bg-red-600 text-white text-[14px] font-semibold hover:bg-red-700"
                  >
                    Confirm Refund
                  </button>
                </div>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
