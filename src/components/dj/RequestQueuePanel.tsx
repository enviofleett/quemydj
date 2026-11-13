'use client';

import React, { useState } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { SongRequest, Song } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { analyzeTrackCompatibility } from '@/services/smartQueueService';
import {
  Sparkles,
  ListOrdered,
  Check,
  X,
  Zap,
  ShieldCheck,
  Disc
} from 'lucide-react';
import Image from 'next/image';

interface RequestQueuePanelProps {
  currentTrackA: Song | null;
  currentTrackB: Song | null;
  onLoadRequestToDeck: (deck: 'A' | 'B', req: SongRequest) => void;
}

export const RequestQueuePanel: React.FC<RequestQueuePanelProps> = ({
  currentTrackA,
  currentTrackB,
  onLoadRequestToDeck,
}) => {
  const { requests, updateRequestStatus, processRefund } = useCueApp();
  const [queueMode, setQueueMode] = useState<'smart' | 'manual'>('smart');
  const [filterTab, setFilterTab] = useState<'active' | 'completed' | 'all'>('active');

  const activePlayingTrack = currentTrackA || currentTrackB;

  // Filter requests according to view tab
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
      return r.status === 'playing' || r.status === 'played' || r.status === 'declined' || r.status === 'refunded';
    }
    return true;
  });

  // Smart Queue recommendation scoring
  const requestsWithAnalysis = filteredRequests.map((req) => {
    const analysis = analyzeTrackCompatibility(activePlayingTrack, req);
    return {
      req,
      analysis,
    };
  });

  // Sort by Smart Score if in Smart mode, otherwise chronological
  const displayRequests =
    queueMode === 'smart' && filterTab === 'active'
      ? [...requestsWithAnalysis].sort((a, b) => b.analysis.matchScore - a.analysis.matchScore)
      : requestsWithAnalysis;

  return (
    <div className="flex flex-col h-full bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] shadow-xl overflow-hidden transition-colors">
      {/* Header Bar */}
      <div className="p-3.5 border-b border-[var(--dj-border)] flex items-center justify-between gap-3 bg-[var(--dj-bg-card)]">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-[var(--dj-text-primary)] tracking-tight flex items-center gap-2">
            <Disc className="w-4 h-4 text-emerald-500" />
            Live Request Queue
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] border border-[var(--dj-border)]">
            {filteredRequests.length}
          </span>
        </div>

        {/* Mode Toggle: Smart Queue vs Manual Queue */}
        <div className="flex items-center gap-1 bg-black/10 dark:bg-black/40 p-1 rounded-xl border border-[var(--dj-border)]">
          <button
            type="button"
            onClick={() => setQueueMode('smart')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-tight transition-all flex items-center gap-1.5 ${
              queueMode === 'smart'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-sm'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart Queue
          </button>
          <button
            type="button"
            onClick={() => setQueueMode('manual')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-tight transition-all flex items-center gap-1.5 ${
              queueMode === 'manual'
                ? 'bg-[var(--dj-bg-control)] text-[var(--dj-text-primary)] shadow-sm'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            Manual
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 border-b border-[var(--dj-border)] bg-[var(--dj-bg-card-subtle)] flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterTab === 'active'
                ? 'bg-[var(--dj-bg-control)] text-[var(--dj-text-primary)] font-semibold'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            Incoming &amp; Accepted
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('completed')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterTab === 'completed'
                ? 'bg-[var(--dj-bg-control)] text-[var(--dj-text-primary)] font-semibold'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            Played / History
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterTab === 'all'
                ? 'bg-[var(--dj-bg-control)] text-[var(--dj-text-primary)] font-semibold'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            All Requests
          </button>
        </div>

        {queueMode === 'smart' && activePlayingTrack && (
          <div className="text-[11px] text-[var(--dj-text-muted)] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Harmonic analysis active for playing set</span>
          </div>
        )}
      </div>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--dj-border-subtle)] p-2 space-y-2">
        {displayRequests.length === 0 ? (
          <div className="p-8 text-center text-[var(--dj-text-muted)] text-[13px] space-y-1">
            <div>No customer requests in this view.</div>
            <p className="text-[11px] text-[var(--dj-text-faint)]">
              When guests tip &amp; request songs from your booth QR, they appear here instantly.
            </p>
          </div>
        ) : (
          displayRequests.map(({ req, analysis }) => {
            const isAwaitingOrNew = req.status === 'waiting' || req.status === 'new_request';
            const isAccepted = req.status === 'accepted' || req.status === 'preparing';

            return (
              <div
                key={req.id}
                className="p-3 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] hover:border-[var(--dj-border-highlight)] transition-all space-y-2.5"
              >
                {/* Top Row: Song info + Tip + Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--dj-bg-control)] shadow">
                      <Image
                        src={req.song.coverUrl}
                        alt={req.song.title}
                        width={44}
                        height={44}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[var(--dj-text-primary)] truncate">
                          {req.song.title}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="text-[11px] text-[var(--dj-text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                        <span className="text-[var(--dj-text-secondary)] font-medium">{req.song.artist}</span>
                        <span>·</span>
                        <span>{req.guestName}</span>
                        <span>·</span>
                        <span className="text-[var(--dj-text-faint)]">{req.paidVia}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Amount & Server-Verified Badge */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +₦{req.amount.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-500 font-medium justify-end mt-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </div>
                  </div>
                </div>

                {/* Guest note if present */}
                {req.guestNote && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-[var(--dj-bg-control)] text-[11px] text-[var(--dj-text-secondary)] border border-[var(--dj-border)]">
                    &quot;{req.guestNote}&quot;
                  </div>
                )}

                {/* Smart Recommendation Diagnostic banner (if smart mode) */}
                {queueMode === 'smart' && analysis && (
                  <div className="p-2 rounded-lg bg-black/5 dark:bg-black/40 border border-[var(--dj-border)] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          analysis.matchTier === 'Excellent Match'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : analysis.matchTier === 'Good Match'
                            ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                            : analysis.matchTier === 'Possible Transition'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-muted)]'
                        }`}
                      >
                        {analysis.matchTier} ({analysis.matchScore}%)
                      </span>
                      <span className="text-[var(--dj-text-muted)] truncate">{analysis.reason}</span>
                    </div>

                    {analysis.qualityWarning && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        {analysis.qualityWarning}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions Bottom Bar */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-[10px] text-[var(--dj-text-faint)] font-mono">
                    Ref: {req.referenceCode} · {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Decline / Refund trigger */}
                    {req.status !== 'declined' && req.status !== 'refunded' && req.status !== 'played' && (
                      <button
                        type="button"
                        onClick={() => processRefund(req.id, 'DJ set format conflict')}
                        title="Decline request & automatically refund guest"
                        className="px-2 py-1 rounded text-[11px] font-medium text-rose-500 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Decline &amp; Refund
                      </button>
                    )}

                    {/* Accept button */}
                    {isAwaitingOrNew && (
                      <button
                        type="button"
                        onClick={() => updateRequestStatus(req.id, 'accepted')}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Accept
                      </button>
                    )}

                    {/* Load to Deck A or Deck B buttons */}
                    {(isAccepted || req.status === 'ready_to_play') && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadRequestToDeck('A', req);
                            updateRequestStatus(req.id, 'playing');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--dj-bg-control)] hover:bg-cyan-600 hover:text-black text-cyan-600 dark:text-cyan-300 transition-colors"
                        >
                          LOAD A
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onLoadRequestToDeck('B', req);
                            updateRequestStatus(req.id, 'playing');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--dj-bg-control)] hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-300 transition-colors"
                        >
                          LOAD B
                        </button>
                      </div>
                    )}

                    {/* Mark as Played trigger */}
                    {req.status === 'playing' && (
                      <button
                        type="button"
                        onClick={() => updateRequestStatus(req.id, 'played')}
                        className="px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-black transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mark Played
                      </button>
                    )}
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
