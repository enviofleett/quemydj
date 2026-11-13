'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useCueApp } from '@/context/CueAppContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  PlayCircle,
  CheckCheck,
  XCircle,
  AlertCircle,
  ThumbsUp,
  MessageSquareWarning,
  Share2,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';

export default function RequestStatusPage({ params }: { params: Promise<{ requestId: string }> }) {
  const resolvedParams = use(params);
  const { requests, provideRequestFeedback } = useCueApp();

  const [feedbackNote, setFeedbackNote] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'played_confirmed' | 'reported_problem'>('played_confirmed');

  const request = requests.find((r) => r.id === resolvedParams.requestId) || requests[0];

  // Timeline Steps
  const timelineSteps = [
    { key: 'waiting', label: '1. Waiting for DJ', desc: 'DJ received request in booth queue' },
    { key: 'accepted', label: '2. Accepted', desc: 'DJ queued track into their set' },
    { key: 'playing', label: '3. Now Playing', desc: 'Song is currently live on club sound system' },
    { key: 'played', label: '4. Played', desc: 'Request fulfilled & set completed' },
  ];

  const getStepState = (stepKey: string) => {
    if (request.status === 'declined' || request.status === 'refunded') {
      return 'declined';
    }

    const order = ['waiting', 'accepted', 'playing', 'played'];
    const currentIndex = order.indexOf(request.status);
    const stepIndex = order.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const handleFeedbackSubmit = () => {
    provideRequestFeedback(request.id, feedbackType, feedbackNote);
    setShowFeedbackModal(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-20 space-y-6">
      {/* Top back & details */}
      <div className="flex items-center justify-between">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131b26] border border-[#233044] text-xs font-semibold text-slate-300 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>My Requests</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-400 bg-[#141b26] px-2.5 py-1 rounded-lg border border-[#233044]">
            Ref: {request.referenceCode}
          </span>
        </div>
      </div>

      {/* Main Track Header Card */}
      <div className="bg-[#111722] border border-[#233044] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <StatusBadge status={request.status} size="md" />
          <span className="text-xs text-slate-400">
            {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <img
            src={request.song.coverUrl}
            alt={request.song.title}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-lg border border-[#26374f] flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
              {request.song.title}
            </h1>
            <p className="text-sm font-semibold text-slate-300 truncate">
              {request.song.artist}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <span>{request.song.genre}</span>
              <span>•</span>
              <span>{request.song.duration}</span>
            </div>
          </div>
        </div>

        {/* DJ & Venue Info Strip */}
        <div className="mt-5 pt-4 border-t border-[#1d293c] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <img
              src={request.djAvatar}
              alt={request.djName}
              className="w-7 h-7 rounded-full object-cover"
            />
            <div>
              <span className="font-bold text-white block">{request.djName}</span>
              <span className="text-[11px] text-slate-400">{request.venueName}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Total Paid</span>
            <span className="font-extrabold text-emerald-400 text-sm">
              ₦{request.total.toLocaleString()}
            </span>
          </div>
        </div>

        {request.guestNote && (
          <div className="mt-3 p-3 rounded-xl bg-[#16202f] text-xs text-slate-300 border border-[#26354c]">
            <span className="font-bold text-slate-400 block mb-0.5">Your Dedication / Booth Note:</span>
            &ldquo;{request.guestNote}&rdquo;
          </div>
        )}
      </div>

      {/* Decline / Refund Reason Card */}
      {request.status === 'declined' && (
        <div className="p-5 rounded-2xl bg-rose-950/50 border border-rose-800 text-xs text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
            <XCircle className="w-4 h-4" />
            <span>Request Declined by DJ</span>
          </div>
          <p>
            {request.declineReason ||
              'The DJ was unable to accommodate this track during their current set progression.'}
          </p>
          <div className="text-[11px] text-emerald-300 font-semibold pt-1">
            ✓ A full refund of ₦{request.total.toLocaleString()} was immediately credited back to your {request.paidVia}.
          </div>
        </div>
      )}

      {/* Visual Progress Timeline (Steps 1 to 4) */}
      <div className="bg-[#111722] border border-[#233044] rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center justify-between">
          <span>Live Song Timeline</span>
          {request.status === 'playing' && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live on speakers right now!
            </span>
          )}
        </h2>

        <div className="space-y-6 pt-2">
          {timelineSteps.map((step, idx) => {
            const state = getStepState(step.key);

            return (
              <div key={step.key} className="flex items-start gap-4 relative">
                {/* Connecting Line */}
                {idx < timelineSteps.length - 1 && (
                  <div
                    className={`absolute left-4 top-8 w-0.5 h-10 -ml-px ${
                      state === 'completed'
                        ? 'bg-emerald-500'
                        : state === 'current'
                        ? 'bg-emerald-500/50'
                        : 'bg-slate-700'
                    }`}
                  />
                )}

                {/* State Icon Indicator */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-colors ${
                    state === 'completed'
                      ? 'bg-emerald-500 text-black font-bold'
                      : state === 'current'
                      ? 'bg-emerald-400 text-black font-bold ring-4 ring-emerald-500/20'
                      : 'bg-[#182332] text-slate-500 border border-[#2a3a52]'
                  }`}
                >
                  {state === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : state === 'current' ? (
                    <PlayCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>

                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        state === 'current'
                          ? 'text-emerald-400'
                          : state === 'completed'
                          ? 'text-white'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {state === 'current' && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        In Progress
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guest Confirmation / Problem Reporting (after Played) */}
      {request.status === 'played' && (
        <div className="bg-[#111722] border border-[#233044] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span>DJ Marked Song as Played</span>
            </h3>
            {request.feedbackGiven && (
              <span className="text-[11px] text-emerald-400 font-bold">
                Feedback Recorded ✓
              </span>
            )}
          </div>

          {!request.feedbackGiven ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-slate-300">
                Did you hear {request.song.title} played by {request.djName}? Help verify the session quality:
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => {
                    setFeedbackType('played_confirmed');
                    handleFeedbackSubmit();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Yes, I heard it!</span>
                </button>

                <button
                  onClick={() => {
                    setFeedbackType('reported_problem');
                    setShowFeedbackModal(true);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquareWarning className="w-3.5 h-3.5 text-amber-400" />
                  <span>Report an Issue</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              {request.feedbackGiven === 'played_confirmed' ? (
                <span className="text-emerald-400 font-semibold">
                  Thank you! You confirmed this song was played at {request.venueName}.
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">
                  You reported an issue: &ldquo;{request.feedbackNote || 'Disputed playback'}&rdquo;. Support is reviewing.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Switch to DJ Booth Reviewer Notice */}
      <div className="p-4 rounded-2xl bg-[#0f1724] border border-[#233044] text-xs text-slate-300 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white block">Evaluating End-to-End Demo?</span>
          <p className="text-[11px] text-slate-400">
            Switch to the <strong>DJ Workspace</strong> in the top demo banner to accept, mark as playing, and play this request in real-time.
          </p>
        </div>
      </div>

      {/* Report problem modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-[#233044] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Report Song Playback Issue</h3>
            <p className="text-xs text-slate-400">
              If the DJ skipped your track or played the wrong song, explain what happened below for a refund review:
            </p>
            <textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="e.g. Song was cut off after 20 seconds, or wrong remix was played..."
              rows={3}
              className="w-full p-3 rounded-xl bg-[#16202f] border border-[#2a3a52] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
