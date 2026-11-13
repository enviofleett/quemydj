'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import {
  ChevronLeft,
  MapPin,
  Clock,
  Music2,
  DollarSign,
  AlertCircle,
  Radio,
  Share2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

export default function DJProfilePage({ params }: { params: Promise<{ djId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { djs, requests } = useCueApp();

  const dj = djs.find((d) => d.id === resolvedParams.djId) || djs[0];
  const session = dj.liveSession;
  const isAccepting = session?.isAcceptingRequests ?? false;

  // Recent requests played or waiting for this DJ
  const djRequests = requests.filter((r) => r.djId === dj.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-16 space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/discover"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131b26] border border-[#233044] text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Discover</span>
        </Link>

        <button
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            alert('DJ Session link copied to clipboard!');
          }}
          className="p-2 rounded-xl bg-[#131b26] border border-[#233044] text-slate-300 hover:text-white"
          title="Share link"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Banner & DJ Identity Card */}
      <div className="relative rounded-3xl overflow-hidden bg-[#101724] border border-[#233044] shadow-2xl">
        <div className="h-44 sm:h-56 w-full relative">
          <img
            src={dj.bannerUrl}
            alt={dj.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101724] via-[#101724]/60 to-black/30" />

          {/* Live Status Pill in Hero */}
          <div className="absolute top-4 left-4">
            {session ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE SESSION NOW</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-black/80 border border-white/10 text-xs font-semibold text-slate-300">
                Offline / Not Performing
              </span>
            )}
          </div>
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 pb-6 pt-2 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            <div className="flex items-end gap-4">
              <img
                src={dj.avatarUrl}
                alt={dj.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-[#101724] object-cover shadow-2xl bg-black"
              />
              <div className="space-y-0.5 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {dj.name}
                  </h1>
                  <span className="text-xs bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                    ★ {dj.rating}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">{dj.handle}</div>
              </div>
            </div>

            {/* Quick Action in Header */}
            {session && (
              <div className="self-start sm:self-auto">
                <Link
                  href={isAccepting ? `/request/${session.id}` : '#'}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${
                    isAccepting
                      ? 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-500/25'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-75'
                  }`}
                  onClick={(e) => {
                    if (!isAccepting) e.preventDefault();
                  }}
                >
                  <Music2 className="w-4 h-4" />
                  <span>{isAccepting ? `Request a Song (₦${session.basePrice.toLocaleString()})` : 'Requests Paused'}</span>
                </Link>
              </div>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            {dj.bio}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#1d293c]">
            <span className="text-xs font-semibold text-slate-400">Genres:</span>
            {dj.genres.map((g) => (
              <span
                key={g}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-[#182333] text-slate-200 border border-[#27374f]"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Active Session Details Box */}
      {session ? (
        <div className="bg-[#111722] border border-[#233044] rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2b3e] pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Active Live Session
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {session.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-700">
                Code: {session.passcode}
              </span>
              <div
                className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                  isAccepting
                    ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-400'
                    : 'bg-amber-950/50 border-amber-500/50 text-amber-400'
                }`}
              >
                {isAccepting ? 'Requests Open' : 'Queue Temporarily Paused'}
              </div>
            </div>
          </div>

          {/* Session Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#16202f] p-3 rounded-xl border border-[#233044]">
              <span className="text-slate-400 block mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Venue
              </span>
              <span className="font-bold text-white">{dj.currentVenue.name}</span>
              <span className="text-[11px] text-slate-400 block truncate">
                {dj.currentVenue.city}
              </span>
            </div>

            <div className="bg-[#16202f] p-3 rounded-xl border border-[#233044]">
              <span className="text-slate-400 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Set Time
              </span>
              <span className="font-bold text-white">
                {session.startTime} – {session.endTime}
              </span>
              <span className="text-[11px] text-emerald-400 block">
                Live on stage
              </span>
            </div>

            <div className="bg-[#16202f] p-3 rounded-xl border border-[#233044]">
              <span className="text-slate-400 block mb-1 flex items-center gap-1">
                <span className="text-amber-400 font-bold">₦</span>
                Standard Request
              </span>
              <span className="font-bold text-white">
                ₦{session.basePrice.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 block">
                + ₦{session.serviceFee.toLocaleString()} processing
              </span>
            </div>

            <div className="bg-[#16202f] p-3 rounded-xl border border-[#233044]">
              <span className="text-slate-400 block mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Avg Response
              </span>
              <span className="font-bold text-white">3 – 5 minutes</span>
              <span className="text-[11px] text-slate-400 block">
                Refund if declined
              </span>
            </div>
          </div>

          {/* Announcement banner */}
          {session.announcement && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-xs text-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-amber-300">DJ Announcement:</span>
                {session.announcement}
              </div>
            </div>
          )}

          {/* DJ Request Rules */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              DJ Request Guidelines:
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-400">
              {session.requestRules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Request Button */}
          <div className="pt-2">
            {isAccepting ? (
              <Link
                href={`/request/${session.id}`}
                className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.99]"
              >
                <Music2 className="w-4 h-4" />
                <span>Search & Request a Song — ₦{session.basePrice.toLocaleString()}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            ) : (
              <div className="p-4 rounded-xl bg-[#182232] border border-[#2a3a52] text-center space-y-1">
                <p className="text-xs font-bold text-amber-400">
                  Requests are currently paused for this session
                </p>
                <p className="text-[11px] text-slate-400">
                  The DJ is currently spinning an exclusive transition or routine. Please check back shortly!
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#111722] border border-[#233044] rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <h2 className="text-base font-bold text-white">DJ is Currently Offline</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {dj.name} does not have an active live session at this time. Song requests are only allowed during active verified sets.
          </p>
        </div>
      )}

      {/* Live Session Queue Snapshot for Guests */}
      <div className="bg-[#101622] border border-[#233044] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Session Queue Activity</span>
            <span className="text-xs text-slate-400 font-normal">
              ({djRequests.length} recent submissions)
            </span>
          </h3>
          <span className="text-[11px] text-slate-400">Updated in real-time</span>
        </div>

        {djRequests.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            No requests have been submitted yet. Be the first to start the party!
          </p>
        ) : (
          <div className="space-y-2">
            {djRequests.slice(0, 4).map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-xl bg-[#151e2b] border border-[#233044] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={req.song.coverUrl}
                    alt={req.song.title}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">{req.song.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{req.song.artist}</div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      req.status === 'playing'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : req.status === 'accepted'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : req.status === 'played'
                        ? 'bg-slate-700/30 text-slate-400 border-slate-700'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    {req.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
