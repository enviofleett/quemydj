'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Sparkles, Flame, Music2, Disc3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfd] text-zinc-900 selection:bg-emerald-500 selection:text-white flex flex-col font-sans relative overflow-x-hidden">
      
      {/* VIBRANT, WARM SOCIAL LIGHT-MODE BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Full rich festival & DJ club crowd photography in vibrant high visibility */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.38] scale-100 transform-gpu"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=90&w=2400&auto=format&fit=crop')`,
          }}
        />
        {/* Soft radial brightness glow around center to keep text punchy while stage lights shine through */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#fcfcfd]/90 via-[#fcfcfd]/25 to-[#fcfcfd]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(252,252,253,0.65)_0%,_transparent_75%)]" />
        
        {/* Vibrant club & stage ambient color boosts */}
        <div className="absolute -top-32 left-1/4 w-[600px] h-[500px] bg-emerald-400/20 blur-[130px] rounded-full" />
        <div className="absolute top-[40%] -right-20 w-[550px] h-[550px] bg-purple-400/20 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-amber-300/20 blur-[140px] rounded-full" />
      </div>

      {/* TOP HEADER */}
      <header className="relative z-20 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl sticky top-0 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center flex-shrink-0 shadow-md border border-black/5 group-hover:scale-105 transition-transform">
              <img
                src="/brand-logo-transparent.png"
                alt="QueMyDJ Logo"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-zinc-950 leading-tight">QueMyDJ</span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-emerald-700 uppercase">Powered by Zenbeatz</span>
            </div>
          </Link>

          {/* Direct Dual Login in Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/venue"
              className="hidden md:inline-flex text-xs sm:text-sm font-semibold tracking-wide px-3 sm:px-4 py-2 rounded-full text-zinc-700 hover:text-black hover:bg-black/[0.04] transition-all"
            >
              Venue Portal
            </Link>
            <Link
              href="/login?role=dj"
              className="text-xs sm:text-sm font-semibold tracking-wide px-3 sm:px-4 py-2 rounded-full text-zinc-700 hover:text-black hover:bg-black/[0.04] transition-all"
            >
              DJ Portal
            </Link>
            <Link
              href="/login?role=guest"
              className="text-xs sm:text-sm font-bold tracking-wide px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 transition-all shadow-md shadow-black/10 active:scale-95"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION - SWEET, VIBRANT, CENTERED */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20 w-full text-center">
        
        {/* Soft Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          The Social Playlist Takeover
        </div>

        {/* Crisp Central Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-zinc-950 leading-[1.08] mb-6 max-w-4xl mx-auto">
          You Are The Party.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">
            Take Over The Playlist.
          </span>
        </h1>

        {/* Clean, Conversational Subcopy */}
        <p className="text-base sm:text-xl text-zinc-600 font-normal leading-relaxed max-w-2xl mx-auto mb-10 sm:mb-14 px-2">
          Why wait on the DJ? You and your crew are the life of the party. Use tokens to drop your favorite anthems, steer the club’s vibe, and hear your songs played live.
        </p>

        {/* TWO PRIMARY PORTAL CARDS: SOCIAL GOERS & DJS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl text-left">
          
          {/* Card 1: Social Goers */}
          <div className="group relative rounded-3xl bg-white border border-zinc-200/80 hover:border-emerald-500/50 p-7 sm:p-9 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-emerald-500/5">
            <div 
              className="absolute top-0 right-0 w-64 h-64 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity rounded-bl-full pointer-events-none"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=800&auto=format&fit=crop')`,
              }}
            />
            
            <div className="relative z-10">
              <span className="inline-block text-[11px] sm:text-xs uppercase tracking-widest font-black text-emerald-600 mb-2 sm:mb-3">
                For Social Goers & Guests
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight mb-2 sm:mb-3">
                Steer The Vibe Tonight.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6 sm:mb-8 font-normal">
                Connect to the venue's active DJ booth. Use tokens to request your tracks, attach crew shoutouts, and jump the queue so your song drops when the energy is peaked.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-5 border-t border-zinc-100">
              <Link
                href="/booth"
                className="flex-1 py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm text-center transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98]"
              >
                <span>Find Live Booth</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login?role=guest&redirect=/booth"
                className="py-3.5 px-5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs sm:text-sm text-center transition-all border border-zinc-200 flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <span>Guest Sign In</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
              </Link>
            </div>
          </div>

          {/* Card 2: DJs */}
          <div className="group relative rounded-3xl bg-white border border-zinc-200/80 hover:border-zinc-950/40 p-7 sm:p-9 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-black/5">
            <div 
              className="absolute top-0 right-0 w-64 h-64 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity rounded-bl-full pointer-events-none"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop')`,
              }}
            />

            <div className="relative z-10">
              <span className="inline-block text-[11px] sm:text-xs uppercase tracking-widest font-black text-zinc-800 mb-2 sm:mb-3">
                For DJs & Selectors
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight mb-2 sm:mb-3">
                Monetize The Floor.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-6 sm:mb-8 font-normal">
                Take song requests without distraction. Earn tokens on every request and priority drop, screen tracks to match your set, and keep your crowd hyped all night.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-5 border-t border-zinc-100">
              <Link
                href="/dj/workstation"
                className="flex-1 py-3.5 px-5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-extrabold text-xs sm:text-sm text-center transition-all flex items-center justify-center gap-2 shadow-md shadow-black/15 active:scale-[0.98]"
              >
                <span>Open DJ Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login?role=dj&redirect=/dj/workstation"
                className="py-3.5 px-5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs sm:text-sm text-center transition-all border border-zinc-200 flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <span>DJ Login</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
              </Link>
            </div>
          </div>

        </div>

        {/* THIRD COMPACT VENUE OWNER REGISTRATION BANNER */}
        <div className="mt-8 w-full max-w-4xl p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-50/80 via-white to-zinc-50 border border-emerald-200/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-950">
                  Own a Club, Lounge, or Nightlife Space?
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Venue Owners
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5 max-w-xl">
                Onboard your venue to earn automated commission splits on every song request, track live crowd spend, and manage resident selectors.
              </p>
            </div>
          </div>
          <Link
            href="/venue"
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs text-center transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>Register Venue &rarr;</span>
          </Link>
        </div>

        {/* SOCIAL CROWD STATS STRIP */}
        <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-4xl text-zinc-500 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500" />
            <span className="text-zinc-900 font-bold">Active in 120+ Clubs, Lounges & Events</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-zinc-500 font-medium">
            <span>Instant Token Requests</span>
            <span>•</span>
            <span>Live Queue ETA</span>
            <span>•</span>
            <span>Direct DJ Booth Connect</span>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-zinc-200/80 bg-white py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 text-center sm:text-left">
          <div>
            <span className="text-zinc-900 font-bold">QueMyDJ</span>
            <span> — Powered by Zenbeatz. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-6 font-medium">
            <Link href="/booth" className="hover:text-zinc-950 transition-colors">Booth Scanner</Link>
            <Link href="/login" className="hover:text-zinc-950 transition-colors">Sign In</Link>
            <Link href="/dj" className="hover:text-zinc-950 transition-colors">DJ Workspace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
