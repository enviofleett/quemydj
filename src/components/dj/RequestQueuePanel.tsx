'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useCueApp } from '@/context/CueAppContext';
import { SongRequest, Song, RequestStatus } from '@/types';
import { analyzeTrackCompatibility } from '@/services/smartQueueService';
import {
  Check,
  X,
  Copy,
  Play,
  Pause,
  Inbox,
} from 'lucide-react';

interface RequestQueuePanelProps {
  activeBridgeSong: Song | null;
  isPlayingBridge: boolean;
  onPlayBridgeTrack: (song: Song) => void;
  onPauseBridgeTrack: () => void;
}

const STATUS_META: Record<
  RequestStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  awaiting_payment: {
    label: 'Unpaid',
    dotClass: 'bg-zinc-400',
    textClass: 'text-[var(--dj-text-muted)]',
  },
  payment_confirmed: {
    label: 'Paid',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  waiting: {
    label: 'Pending',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  new_request: {
    label: 'New',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  accepted: {
    label: 'Accepted',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  preparing: {
    label: 'Queued',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  ready_to_play: {
    label: 'Ready',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
  playing: {
    label: 'In Mix',
    dotClass: 'bg-emerald-500 animate-pulse',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  played: {
    label: 'Played',
    dotClass: 'bg-emerald-500',
    textClass: 'text-[var(--dj-text-muted)]',
  },
  declined: {
    label: 'Passed',
    dotClass: 'bg-zinc-400',
    textClass: 'text-[var(--dj-text-muted)]',
  },
  unavailable: {
    label: 'Unavailable',
    dotClass: 'bg-zinc-400',
    textClass: 'text-[var(--dj-text-muted)]',
  },
  refund_pending: {
    label: 'Refunding',
    dotClass: 'bg-rose-400',
    textClass: 'text-[var(--dj-text-muted)]',
  },
  refunded: {
    label: 'Refunded',
    dotClass: 'bg-rose-400',
    textClass: 'text-[var(--dj-text-muted)]',
  },
};

export const RequestQueuePanel: React.FC<RequestQueuePanelProps> = ({
  activeBridgeSong,
  isPlayingBridge,
  onPlayBridgeTrack,
  onPauseBridgeTrack,
}) => {
  const { requests, updateRequestStatus, processRefund } = useCueApp();
  const [queueMode, setQueueMode] = useState<'smart' | 'manual'>('smart');
  const [filterTab, setFilterTab] = useState<'active' | 'completed' | 'all'>('active');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (req: SongRequest) => {
    const query = `${req.song.artist} - ${req.song.title}`;
    navigator.clipboard.writeText(query);
    setCopiedId(req.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredRequests = requests.filter((r) => {
    if (filterTab === 'active') {
      return (
        r.status === 'waiting' ||
        r.status === 'new_request' ||
        r.status === 'accepted' ||
        r.status === 'preparing' ||
        r.status === 'ready_to_play'
      );
    }
    if (filterTab === 'completed') {
      return (
        r.status === 'playing' ||
        r.status === 'played' ||
        r.status === 'declined' ||
        r.status === 'refunded'
      );
    }
    return true;
  });

  const requestsWithAnalysis = filteredRequests.map((req) => ({
    req,
    analysis: analyzeTrackCompatibility(activeBridgeSong, req),
  }));

  const displayRequests =
    queueMode === 'smart' && filterTab === 'active'
      ? [...requestsWithAnalysis].sort((a, b) => b.analysis.matchScore - a.analysis.matchScore)
      : requestsWithAnalysis;

  return (
    <div className="flex flex-col flex-1 min-h-[420px] bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] overflow-hidden transition-colors">
      {/* Unified Toolbar */}
      <div className="px-4 sm:px-5 py-3 border-b border-[var(--dj-border)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'active', label: 'Active' },
              { id: 'completed', label: 'History' },
              { id: 'all', label: 'All' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-[var(--dj-bg-control)] text-[var(--dj-text-primary)]'
                  : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--dj-bg-control)] border border-[var(--dj-border)] shrink-0">
          <button
            type="button"
            onClick={() => setQueueMode('smart')}
            className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
              queueMode === 'smart'
                ? 'bg-[var(--dj-bg-card)] text-[var(--dj-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            Best Match
          </button>
          <button
            type="button"
            onClick={() => setQueueMode('manual')}
            className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
              queueMode === 'manual'
                ? 'bg-[var(--dj-bg-card)] text-[var(--dj-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            Newest
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--dj-border-subtle)]">
        {displayRequests.length === 0 ? (
          <div className="h-full min-h-[280px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--dj-bg-control)] border border-[var(--dj-border)] flex items-center justify-center text-[var(--dj-text-muted)] mb-3">
              <Inbox className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-medium text-[var(--dj-text-primary)]">
              No requests in queue
            </p>
            <p className="text-[12px] text-[var(--dj-text-muted)] mt-1 max-w-[260px] leading-relaxed">
              Incoming song requests from your booth QR code will appear here in real time.
            </p>
          </div>
        ) : (
          displayRequests.map(({ req }) => {
            const isAwaitingOrNew = req.status === 'waiting' || req.status === 'new_request';
            const isAccepted = req.status === 'accepted' || req.status === 'preparing';
            const isPlayingThisBridge = activeBridgeSong?.id === req.song.id && isPlayingBridge;
            const statusInfo = STATUS_META[req.status] || STATUS_META.waiting;
            const hasLifecycleAction =
              req.status !== 'declined' &&
              req.status !== 'refunded' &&
              req.status !== 'played';

            return (
              <div
                key={req.id}
                className="px-4 sm:px-5 py-4 hover:bg-[var(--dj-bg-card-subtle)] transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  {/* Artwork */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[var(--dj-bg-control)] ring-1 ring-black/10 dark:ring-white/10 group">
                    <Image
                      src={req.song.coverUrl}
                      alt={req.song.title}
                      width={48}
                      height={48}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                    {req.song.previewUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          isPlayingThisBridge
                            ? onPauseBridgeTrack()
                            : onPlayBridgeTrack(req.song)
                        }
                        aria-label={isPlayingThisBridge ? 'Pause track' : 'Play track'}
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center text-white transition-opacity cursor-pointer ${
                          isPlayingThisBridge
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isPlayingThisBridge ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Aligned Content Rail */}
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Row 1: Title & Payout */}
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-[14.5px] font-semibold tracking-[-0.015em] text-[var(--dj-text-primary)] truncate">
                        {req.song.title}
                      </h3>
                      <span className="text-[14px] font-semibold tabular-nums tracking-[-0.01em] text-[var(--dj-text-primary)] shrink-0">
                        +₦{req.amount.toLocaleString()}
                      </span>
                    </div>

                    {/* Row 2: Artist / Patron & Subtle Status + Time */}
                    <div className="flex items-center justify-between gap-3 text-[12.5px] -mt-1">
                      <div className="truncate text-[var(--dj-text-secondary)]">
                        <span>{req.song.artist}</span>
                        <span className="mx-1.5 text-[var(--dj-text-faint)]">·</span>
                        <span className="text-[var(--dj-text-muted)]">{req.guestName}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11.5px]">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${statusInfo.textClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>
                        <span className="text-[var(--dj-text-faint)]">·</span>
                        <span className="text-[var(--dj-text-muted)] tabular-nums">
                          {new Date(req.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Optional Patron Note (aligned on the same editorial rail) */}
                    {req.guestNote && (
                      <p className="text-[12.5px] text-[var(--dj-text-secondary)] border-l-2 border-[var(--dj-border-highlight)] pl-2.5 py-0.5 leading-snug">
                        “{req.guestNote}”
                      </p>
                    )}

                    {/* Row 3: Metadata + Compact Utility & Lifecycle Actions */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                      <div className="flex items-center gap-3 text-[11.5px] text-[var(--dj-text-muted)]">
                        {(req.song.bpm || req.song.musicalKey) && (
                          <span className="font-mono tabular-nums text-[var(--dj-text-muted)]">
                            {req.song.bpm ? `${req.song.bpm} BPM` : ''}
                            {req.song.bpm && req.song.musicalKey ? ' · ' : ''}
                            {req.song.musicalKey || ''}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => copyToClipboard(req)}
                          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)] transition-colors cursor-pointer"
                        >
                          {copiedId === req.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy title</span>
                            </>
                          )}
                        </button>

                        {req.song.previewUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              isPlayingThisBridge
                                ? onPauseBridgeTrack()
                                : onPlayBridgeTrack(req.song)
                            }
                            className={`inline-flex items-center gap-1 text-[11.5px] font-medium transition-colors cursor-pointer ${
                              isPlayingThisBridge
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
                            }`}
                          >
                            {isPlayingThisBridge ? (
                              <>
                                <Pause className="w-3 h-3 fill-current" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>Preview</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {hasLifecycleAction && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => processRefund(req.id, 'Declined by DJ')}
                            className="h-7 px-2.5 rounded-lg text-[12px] font-medium text-[var(--dj-text-muted)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Pass</span>
                          </button>

                          {isAwaitingOrNew && (
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(req.id, 'accepted')}
                              className="h-7 px-3 rounded-lg text-[12px] font-medium bg-[var(--dj-text-primary)] text-[var(--dj-bg-header)] hover:opacity-90 transition-opacity flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                          )}

                          {isAccepted && (
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(req.id, 'playing')}
                              className="h-7 px-3 rounded-lg text-[12px] font-medium bg-[var(--dj-text-primary)] text-[var(--dj-bg-header)] hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
                            >
                              In Mix
                            </button>
                          )}

                          {req.status === 'playing' && (
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(req.id, 'played')}
                              className="h-7 px-3 rounded-lg text-[12px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Played</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
