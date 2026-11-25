'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 selection:bg-emerald-500 selection:text-black flex flex-col font-sans relative overflow-x-hidden">
      
      {/* RICH NIGHTLIFE & MUSIC BACKGROUND LAYER */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Real authentic DJ & club atmosphere photography */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.62] scale-100 transform-gpu"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=85&w=2200&auto=format&fit=crop')`,
          }}
        />
        {/* Subtle, balanced vignette & gradient so text is crisp while crowd & DJ lighting pop */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/50 to-[#070709]/60" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#070709]/30 to-[#070709]/80" />
      </div>

      {/* TOP HEADER WITH OFFICIAL QueMyDJ LOGO */}
      <header className="relative z-20 border-b border-white/[0.08] bg-[#070709]/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black flex items-center justify-center flex-shrink-0 shadow-md border border-white/10 group-hover:border-emerald-500/40 transition-colors">
              <img
                src="/brand-logo-transparent.png"
                alt="QueMyDJ Logo"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-white leading-tight">QueMyDJ</span>
              <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">Powered by Zenbeatz</span>
            </div>
          </Link>

          {/* Direct Dual Login in Header */}
          <div className="flex items-center gap-3">
            <Link
              href="/login?role=dj"
              className="text-xs sm:text-sm font-semibold tracking-wide px-4 py-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              DJ Portal
            </Link>
            <Link
              href="/login?role=guest"
              className="text-xs sm:text-sm font-bold tracking-wide px-5 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 transition-all shadow-lg"
            >
              Clubber Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="relative z-10 flex-1 flex flex-col justify-center max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24 w-full">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-zinc-300 text-xs font-medium uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Social Nightlife & Venue Playlist Engine
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-6">
            The Crowd Takes Over The Booth.
          </h1>

          <p className="text-lg sm:text-xl text-zinc-300 font-normal leading-relaxed max-w-2xl">
            QueMyDJ bridges the gap between the DJ decks and the dancefloor. Request songs, boost priority with tips, and follow the live set queue without interrupting the mix.
          </p>
        </div>

        {/* TWO PRIMARY PORTAL CARDS: CLUBGOERS & DJS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
          
          {/* Card 1: Clubgoers */}
          <div className="group relative rounded-3xl bg-zinc-900/60 border border-white/[0.08] hover:border-emerald-500/50 p-7 sm:p-9 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-xl">
            <div 
              className="absolute top-0 right-0 w-72 h-72 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity rounded-bl-full pointer-events-none"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=800&auto=format&fit=crop')`,
              }}
            />
            
            <div className="relative z-10">
              <span className="inline-block text-xs uppercase tracking-widest font-bold text-emerald-400 mb-3">
                For Guests & Clubgoers
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
                Hear Your Track Next.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                Connect to the active DJ booth, search songs, attach shoutouts for your crew, and track the queue in real-time as your song approaches.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 border-t border-white/[0.06]">
              <Link
                href="/booth"
                className="flex-1 py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm text-center transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Find Live Booth</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login?role=guest"
                className="py-3.5 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-semibold text-sm text-center transition-all border border-white/[0.08] flex items-center justify-center gap-1.5"
              >
                <span>Guest Sign In</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </Link>
            </div>
          </div>

          {/* Card 2: DJs */}
          <div className="group relative rounded-3xl bg-zinc-900/60 border border-white/[0.08] hover:border-white/30 p-7 sm:p-9 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-xl">
            <div 
              className="absolute top-0 right-0 w-72 h-72 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity rounded-bl-full pointer-events-none"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop')`,
              }}
            />

            <div className="relative z-10">
              <span className="inline-block text-xs uppercase tracking-widest font-bold text-zinc-300 mb-3">
                For DJs & Selectors
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
                Monetize The Booth.
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                Screen incoming song requests, set minimum tip thresholds, filter off-vibe submissions, and keep the dancefloor energized without distraction.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 border-t border-white/[0.06]">
              <Link
                href="/dj/workstation"
                className="flex-1 py-3.5 px-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm text-center transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Open DJ Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login?role=dj"
                className="py-3.5 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-semibold text-sm text-center transition-all border border-white/[0.08] flex items-center justify-center gap-1.5"
              >
                <span>DJ Login</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </Link>
            </div>
          </div>

        </div>

        {/* SOCIAL STATS BAR */}
        <div className="mt-14 pt-10 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-6 text-zinc-400 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-base">Over 120+ Active Clubs & Venues</span>
            <span className="hidden sm:inline text-zinc-600">•</span>
            <span className="hidden sm:inline">Lagos • London • New York • Accra</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <span>Instant Mobile Booth Connect</span>
            <span>•</span>
            <span>Live Queue ETA</span>
            <span>•</span>
            <span>Zero Hardware Setup</span>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#070709] py-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">QueMyDJ</span>
            <span>— Powered by Zenbeatz. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/booth" className="hover:text-zinc-200 transition-colors">Booth Scanner</Link>
            <Link href="/login" className="hover:text-zinc-200 transition-colors">Authentication</Link>
            <Link href="/dj/workstation" className="hover:text-zinc-200 transition-colors">DJ Workstation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
