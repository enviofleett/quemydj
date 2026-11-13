'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ListMusic, Play, ThumbsUp, Check, ChevronLeft, Bell } from 'lucide-react';
import Link from 'next/link';

export default function MyRequestsPage() {
  const router = useRouter();
  const { requests, provideRequestFeedback } = useCueApp();
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'played'>('all');
  const [showNotifToast, setShowNotifToast] = useState(false);

  const filtered = requests.filter((r) => {
    if (filterTab === 'active')
      return r.status === 'waiting' || r.status === 'accepted' || r.status === 'playing';
    if (filterTab === 'played') return r.status === 'played' || r.status === 'declined';
    return true;
  });

  return (
    <div className="flex flex-col flex-1 px-5 pt-4 pb-24 space-y-4 bg-white dark:bg-[#090a0d] text-zinc-950 dark:text-zinc-100 min-h-[100dvh] transition-colors duration-200">
      {/* Top Navigation & Notification Icon */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          onClick={(e) => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              e.preventDefault();
              router.back();
            }
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors py-1.5 -ml-1 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            setShowNotifToast(true);
            setTimeout(() => setShowNotifToast(false), 3500);
          }}
          aria-label="Live notifications"
          title="Notifications"
          className="relative w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer border border-transparent dark:border-zinc-800/80"
        >
          <Bell className="w-4 h-4" />
          {requests.some((r) => r.status === 'waiting' || r.status === 'accepted' || r.status === 'playing') && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#090a0d]" />
          )}
        </button>
      </div>

      {/* Notification Toast Alert */}
      {showNotifToast && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span>Live queue notifications are active for your booth requests</span>
          </div>
          <button
            type="button"
            onClick={() => setShowNotifToast(false)}
            className="text-emerald-600 dark:text-emerald-400 hover:opacity-75 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      <div>
        <h1 className="text-[22px] font-bold text-zinc-950 dark:text-white tracking-tight leading-tight">
          Requests
        </h1>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
          Real-time approval status, live rotation, and receipts
        </p>
      </div>

      {/* Native iOS Segmented Control */}
      <div
        role="tablist"
        aria-label="Filter request history"
        className="grid grid-flow-col auto-cols-fr p-1 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800/80 rounded-xl"
      >
        {[
          { id: 'all', label: `All (${requests.length})` },
          { id: 'active', label: 'In Queue' },
          { id: 'played', label: 'History' },
        ].map((tab) => {
          const isCurrent = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => setFilterTab(tab.id as typeof filterTab)}
              className={`h-8 rounded-[9px] text-[13px] tabular-nums transition-all flex items-center justify-center ${
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

      {/* Requests List — Single Surface Cards with Hairline Dividers */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-black/[0.06] dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60 p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center mx-auto">
              <ListMusic className="w-5 h-5" />
            </div>
            <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">No requests found</h3>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
              Connect to a DJ booth to submit your first track.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-9 px-4 mt-1 rounded-full bg-zinc-950 dark:bg-emerald-500 text-white dark:text-black text-[13px] font-semibold hover:bg-zinc-800 dark:hover:bg-emerald-400 transition-colors"
            >
              Scan Booth QR
            </Link>
          </div>
        ) : (
          filtered.map((req) => {
            const isPlaying = req.status === 'playing';
            const createdTime = new Date(req.createdAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'UTC',
            });
            const updatedTime = new Date(req.updatedAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'UTC',
            });

            return (
              <article
                key={req.id}
                className={`rounded-2xl p-4 transition-all ${
                  isPlaying
                    ? 'bg-white dark:bg-[#111722] border border-emerald-500/40 ring-1 ring-emerald-500/15 shadow-[0_2px_12px_rgba(16,185,129,0.08)]'
                    : 'bg-white dark:bg-[#111722] border border-black/[0.07] dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative flex-shrink-0">
                    <img
                      src={req.djAvatar}
                      alt={req.djName}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/[0.06] dark:ring-white/10"
                    />
                    {isPlaying && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111722] flex items-center justify-center">
                        <Play className="w-2 h-2 fill-white text-white ml-0.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white truncate leading-snug">
                      {req.song.title}
                    </h3>
                    <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate leading-snug mt-0.5">
                      {req.song.artist}
                    </p>
                    <p className="text-[12px] text-zinc-400 dark:text-zinc-500 truncate mt-1">
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium">{req.djName}</span> · {req.venueName}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-between flex-shrink-0 gap-1.5">
                    <span className="text-[15px] font-semibold text-zinc-900 dark:text-white tabular-nums">
                      ₦{req.total.toLocaleString()}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                </div>

                {req.declineReason && (
                  <p className="mt-2.5 text-[13px] text-red-600 dark:text-red-400 font-medium leading-snug">
                    Declined: {req.declineReason} · Refunded
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-[12px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                  <div className="flex items-center gap-2 truncate">
                    <span>Requested {createdTime}</span>
                    {req.status === 'played' && (
                      <>
                        <span>·</span>
                        <span className="text-zinc-600 dark:text-zinc-300 font-medium">Played {updatedTime}</span>
                      </>
                    )}
                    {isPlaying && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Playing live now</span>
                      </>
                    )}
                  </div>

                  {req.status === 'played' && !req.feedbackGiven && (
                    <button
                      type="button"
                      onClick={() => provideRequestFeedback(req.id, 'played_confirmed')}
                      className="h-7 px-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-[12px] font-medium inline-flex items-center gap-1 transition-colors flex-shrink-0"
                    >
                      <ThumbsUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Confirm Heard</span>
                    </button>
                  )}

                  {req.status === 'played' && req.feedbackGiven && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1 flex-shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
