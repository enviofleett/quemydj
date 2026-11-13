'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCueApp } from '@/context/CueAppContext';
import { Song } from '@/types';
import { djAudioEngine } from '@/services/djAudioEngine';
import { WaveformCanvas } from '@/components/dj/WaveformCanvas';
import { MusicLibraryPanel } from '@/components/dj/MusicLibraryPanel';
import { RequestQueuePanel } from '@/components/dj/RequestQueuePanel';
import { FinancesWalletView } from '@/components/dj/FinancesWalletView';
import { StudioSettingsProfileView } from '@/components/dj/StudioSettingsProfileView';
import {
  Play,
  Pause,
  Sliders,
  Mic,
  Disc3,
  Repeat,
  Radio,
  Clock,
  Sparkles,
  Layers,
  Wallet,
  Settings,
  QrCode,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DJQStudioWorkstationPage() {
  const router = useRouter();
  const { currentDj, requests, themeMode, toggleThemeMode, logoutDj } = useCueApp();
  const session = currentDj.liveSession;

  // Bottom Workspace Dock Tab
  const [activeDockTab, setActiveDockTab] = useState<'requests' | 'library' | 'split' | 'finances' | 'settings'>('split');

  // Mobile Hardware Console Active View: Deck A, Mixer, or Deck B (on screens < lg)
  const [mobileConsoleTab, setMobileConsoleTab] = useState<'deckA' | 'mixer' | 'deckB'>('deckA');

  // Deck Tracks (Null by default in production until loaded from Crate or Queue)
  const [deckASong, setDeckASong] = useState<Song | null>(null);
  const [deckBSong, setDeckBSong] = useState<Song | null>(null);

  // Transport State Deck A
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [progressA, setProgressA] = useState(0); // percentage
  const [currTimeA, setCurrTimeA] = useState(0);
  const [durationA, setDurationA] = useState(0);
  const [pitchA, setPitchA] = useState(0); // +/- 8%
  const [loopActiveA, setLoopActiveA] = useState(false);

  // Transport State Deck B
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [progressB, setProgressB] = useState(0);
  const [currTimeB, setCurrTimeB] = useState(0);
  const [durationB, setDurationB] = useState(0);
  const [pitchB, setPitchB] = useState(0);
  const [loopActiveB, setLoopActiveB] = useState(false);

  // Mixer State
  const [crossfader, setCrossfader] = useState(0); // -1.0 to +1.0
  const masterVol = 1.0;
  const volA = 1.0;
  const volB = 1.0;

  // 3-Band EQ Deck A
  const [eqLowA, setEqLowA] = useState(0);
  const [eqMidA, setEqMidA] = useState(0);
  const [eqHighA, setEqHighA] = useState(0);

  // 3-Band EQ Deck B
  const [eqLowB] = useState(0);
  const [eqMidB] = useState(0);
  const [eqHighB] = useState(0);

  // VU Levels
  const [, setVuLevelA] = useState(0);
  const [, setVuLevelB] = useState(0);
  const [vuMaster, setVuMaster] = useState(0);

  // Mic & Headphone Cue state
  const [micActive, setMicActive] = useState(false);
  const [cueAActive, setCueAActive] = useState(false);
  const [cueBActive, setCueBActive] = useState(false);

  // Toggle headphone cue in engine
  const toggleCueA = () => {
    const next = !cueAActive;
    setCueAActive(next);
    djAudioEngine.setHeadphoneCue('A', next);
  };

  const toggleCueB = () => {
    const next = !cueBActive;
    setCueBActive(next);
    djAudioEngine.setHeadphoneCue('B', next);
  };

  // Session duration timer starts fresh at 0s when going live
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update Crossfader in Audio Engine
  useEffect(() => {
    djAudioEngine.setCrossfade(crossfader);
  }, [crossfader]);

  // Master Volume in Engine
  useEffect(() => {
    djAudioEngine.setMasterVolume(masterVol);
  }, [masterVol]);

  // Deck A Volume & EQ
  useEffect(() => {
    djAudioEngine.setDeckVolume('A', volA);
    djAudioEngine.setEQ('A', 'low', eqLowA);
    djAudioEngine.setEQ('A', 'mid', eqMidA);
    djAudioEngine.setEQ('A', 'high', eqHighA);
  }, [volA, eqLowA, eqMidA, eqHighA]);

  // Deck B Volume & EQ
  useEffect(() => {
    djAudioEngine.setDeckVolume('B', volB);
    djAudioEngine.setEQ('B', 'low', eqLowB);
    djAudioEngine.setEQ('B', 'mid', eqMidB);
    djAudioEngine.setEQ('B', 'high', eqHighB);
  }, [volB, eqLowB, eqMidB, eqHighB]);

  // Playback Rate
  useEffect(() => {
    djAudioEngine.setDeckPlaybackRate('A', 1 + pitchA / 100);
  }, [pitchA]);
  useEffect(() => {
    djAudioEngine.setDeckPlaybackRate('B', 1 + pitchB / 100);
  }, [pitchB]);

  // VU Meter polling loop
  useEffect(() => {
    let animId: number;
    const updateVUMeters = () => {
      if (isPlayingA) {
        setVuLevelA(djAudioEngine.getDeckLevel('A') || Math.floor(45 + Math.random() * 40));
      } else {
        setVuLevelA(0);
      }

      if (isPlayingB) {
        setVuLevelB(djAudioEngine.getDeckLevel('B') || Math.floor(45 + Math.random() * 40));
      } else {
        setVuLevelB(0);
      }

      if (isPlayingA || isPlayingB) {
        setVuMaster(djAudioEngine.getMasterLevel() || Math.floor(55 + Math.random() * 35));
      } else {
        setVuMaster(0);
      }
      animId = requestAnimationFrame(updateVUMeters);
    };
    animId = requestAnimationFrame(updateVUMeters);
    return () => cancelAnimationFrame(animId);
  }, [isPlayingA, isPlayingB]);

  // Deck A Playback Toggle
  const togglePlayA = () => {
    if (!deckASong) return;
    if (isPlayingA) {
      djAudioEngine.pauseDeck('A');
      setIsPlayingA(false);
    } else {
      if (deckASong.previewUrl) {
        djAudioEngine.playDeck(
          'A',
          deckASong.previewUrl,
          (pct, curr, dur) => {
            setProgressA(pct);
            setCurrTimeA(Math.floor(curr));
            setDurationA(Math.floor(dur));
          },
          () => setIsPlayingA(false)
        );
      }
      setIsPlayingA(true);
    }
  };

  // Deck B Playback Toggle
  const togglePlayB = () => {
    if (!deckBSong) return;
    if (isPlayingB) {
      djAudioEngine.pauseDeck('B');
      setIsPlayingB(false);
    } else {
      if (deckBSong.previewUrl) {
        djAudioEngine.playDeck(
          'B',
          deckBSong.previewUrl,
          (pct, curr, dur) => {
            setProgressB(pct);
            setCurrTimeB(Math.floor(curr));
            setDurationB(Math.floor(dur));
          },
          () => setIsPlayingB(false)
        );
      }
      setIsPlayingB(true);
    }
  };

  // Seek Deck A
  const handleSeekA = (pct: number) => {
    setProgressA(pct);
    const targetSeconds = (pct / 100) * durationA;
    setCurrTimeA(Math.floor(targetSeconds));
    djAudioEngine.seekDeck('A', targetSeconds);
  };

  // Seek Deck B
  const handleSeekB = (pct: number) => {
    setProgressB(pct);
    const targetSeconds = (pct / 100) * durationB;
    setCurrTimeB(Math.floor(targetSeconds));
    djAudioEngine.seekDeck('B', targetSeconds);
  };

  // Looping Toggles
  const toggleLoopA = (bars = 4) => {
    const nextState = !loopActiveA;
    setLoopActiveA(nextState);
    if (nextState) {
      const loopSec = (60 / (deckASong?.bpm || 124)) * bars;
      djAudioEngine.setLoop('A', true, currTimeA, currTimeA + loopSec);
    } else {
      djAudioEngine.setLoop('A', false);
    }
  };

  const toggleLoopB = (bars = 4) => {
    const nextState = !loopActiveB;
    setLoopActiveB(nextState);
    if (nextState) {
      const loopSec = (60 / (deckBSong?.bpm || 124)) * bars;
      djAudioEngine.setLoop('B', true, currTimeB, currTimeB + loopSec);
    } else {
      djAudioEngine.setLoop('B', false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Format session duration
  const formatSessionTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--dj-bg-root)] text-[var(--dj-text-primary)] select-none font-sans transition-colors duration-200">
      {/* 1. TOP HEADER & STATUS BAR */}
      <header className="min-h-14 border-b border-[var(--dj-border)] bg-[var(--dj-bg-header)] px-3 sm:px-4 py-2 sm:py-0 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 flex-shrink-0 transition-colors">
        {/* Brand & Studio badge */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Link href="/dj" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center border border-zinc-700/50 group-hover:scale-105 transition-all">
              <Image
                src="/brand-logo-transparent.png"
                alt="QueMyDJ"
                width={32}
                height={32}
                priority
                className="object-contain p-0.5"
              />
            </div>
            <span className="font-black text-base sm:text-lg text-[var(--dj-text-primary)] tracking-tight">
              QueMyDJ
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase bg-zinc-200/70 dark:bg-white/10 text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/20 font-bold">
              STUDIO
            </span>
          </Link>

          <div className="h-5 w-px bg-[var(--dj-border-subtle)] mx-0.5 hidden md:block" />
        </div>

        {/* Center Live Session Telemetry */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 order-3 sm:order-2 w-full sm:w-auto justify-between sm:justify-start pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--dj-border-subtle)]">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--dj-text-muted)] flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>{formatSessionTime(sessionSeconds)}</span>
          </div>
        </div>

        {/* Right Exit & Control Shortcuts */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 order-2 sm:order-3">
          {/* Theme Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleThemeMode}
            title={themeMode === 'light' ? 'Switch to Dark Mode console' : 'Switch to Light Mode console'}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold flex items-center gap-1 sm:gap-1.5 transition-all bg-[var(--dj-bg-control)] text-[var(--dj-text-primary)] hover:bg-[var(--dj-bg-control-hover)] border border-[var(--dj-border)] active:scale-95 cursor-pointer shadow-xs"
          >
            {themeMode === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600 fill-indigo-100" />
                <span className="hidden md:inline">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span className="hidden md:inline">Light</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveDockTab('finances')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeDockTab === 'finances'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'bg-[var(--dj-bg-control)] text-emerald-600 dark:text-emerald-400 hover:bg-[var(--dj-bg-control-hover)] border border-[var(--dj-border)]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Wallet</span>
            <span className="text-[10px] sm:text-[11px] font-mono">
              (₦{requests.reduce((s, r) => s + (r.status !== 'declined' && r.status !== 'refunded' ? r.amount : 0), 0).toLocaleString()})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDockTab('settings')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              activeDockTab === 'settings'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-primary)] hover:bg-[var(--dj-bg-control-hover)] border border-[var(--dj-border)]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Booth</span>
          </button>

          {/* DJ Sign Out Shortcut */}
          <button
            type="button"
            onClick={() => {
              logoutDj();
              router.push('/login');
            }}
            title="Sign out of DJ Booth"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold flex items-center gap-1 transition-all bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* 2. HARDWARE WORKSTATION CHASSIS (DECKS A & B + CENTRAL MIXER) */}
      <section
        style={{
          background: `linear-gradient(to bottom, var(--dj-bg-chassis-from), var(--dj-bg-chassis-via), var(--dj-bg-chassis-to))`,
        }}
        className="p-3 sm:p-4 border-b border-[var(--dj-border)] shadow-xl transition-colors"
      >
        {/* Mobile Deck / Mixer Switcher Pill Tabs (Visible on screens < lg) */}
        <div className="lg:hidden flex items-center justify-center mb-3">
          <div className="inline-flex p-1 rounded-xl bg-[var(--dj-bg-control)] border border-[var(--dj-border)] shadow-inner">
            <button
              type="button"
              onClick={() => setMobileConsoleTab('deckA')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileConsoleTab === 'deckA'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-[var(--dj-text-secondary)] hover:text-[var(--dj-text-primary)]'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>DECK A</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileConsoleTab('mixer')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileConsoleTab === 'mixer'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-[var(--dj-text-secondary)] hover:text-[var(--dj-text-primary)]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>MIXER</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileConsoleTab('deckB')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileConsoleTab === 'deckB'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-[var(--dj-text-secondary)] hover:text-[var(--dj-text-primary)]'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5" />
              <span>DECK B</span>
            </button>
          </div>
        </div>

        <div className="max-w-[1540px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* DECK A VIRTUAL TURNTABLE (Cols 1-5) */}
          <div className={`${mobileConsoleTab === 'deckA' ? 'flex' : 'hidden lg:flex'} lg:col-span-5 bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] p-3 sm:p-4 shadow-xl flex-col justify-between relative overflow-hidden transition-colors`}>
            {/* Top Deck Info Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/40 font-mono">
                    DECK A
                  </span>
                  <span className="text-[14px] font-bold text-[var(--dj-text-primary)] truncate">
                    {deckASong?.title || 'No Track Loaded'}
                  </span>
                </div>
                <div className="text-[12px] text-[var(--dj-text-secondary)] truncate mt-0.5">
                  {deckASong?.artist || 'Select from Queue or Library below'}
                </div>
              </div>

              {/* BPM & Key badges */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] flex-shrink-0">
                {deckASong?.bpm ? (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/60 text-amber-600 dark:text-amber-400 border border-[var(--dj-border)] font-bold">
                    {deckASong.bpm} BPM
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/60 text-[var(--dj-text-faint)] border border-[var(--dj-border)]">
                    -- BPM
                  </span>
                )}
                {deckASong?.musicalKey ? (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/60 text-cyan-600 dark:text-cyan-400 border border-[var(--dj-border)] font-bold">
                    {deckASong.musicalKey}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/60 text-[var(--dj-text-faint)] border border-[var(--dj-border)]">
                    -- KEY
                  </span>
                )}
              </div>
            </div>

            {/* Turntable Platter Visual & Tone-arm */}
            <div className="relative w-full aspect-square max-w-[280px] mx-auto my-2 flex items-center justify-center">
              {/* Outer Cast-aluminum Rim */}
              <div
                style={{
                  background: `linear-gradient(to bottom right, var(--dj-platter-outer-from), var(--dj-platter-outer-via), var(--dj-platter-outer-to))`,
                  borderColor: `var(--dj-platter-border)`,
                }}
                className="w-full h-full rounded-full p-2.5 shadow-2xl border relative transition-colors"
              >
                {/* Vinyl Record */}
                <div
                  className={`w-full h-full rounded-full relative shadow-inner flex items-center justify-center border border-black/80 ${
                    isPlayingA ? 'animate-[spin_2.8s_linear_infinite]' : ''
                  }`}
                  style={{
                    backgroundColor: `var(--dj-platter-vinyl)`,
                    backgroundImage:
                      'repeating-radial-gradient(circle, var(--dj-platter-vinyl) 0, var(--dj-platter-groove) 2px, var(--dj-platter-vinyl) 4px)',
                  }}
                >
                  {/* Vinyl Gloss Sheen Overlay */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 via-transparent to-white/15 pointer-events-none" />

                  {/* Center Vintage Label */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-700 via-yellow-600 to-amber-900 border-2 border-white/20 shadow-md flex flex-col items-center justify-center text-center p-2 relative">
                    <div className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-white/30 absolute" />
                    <span className="text-[8px] font-black uppercase tracking-wider text-black/80 mt-4">
                      DJQ A
                    </span>
                    <span className="text-[9px] font-bold text-black truncate w-full">
                      {deckASong?.genre || 'CUE STEREO'}
                    </span>
                  </div>
                </div>

                {/* S-Shaped Tone-Arm Stylus */}
                <div
                  className={`absolute right-1 top-2 w-16 h-36 pointer-events-none transition-transform duration-700 origin-top-right ${
                    isPlayingA ? 'rotate-[18deg]' : 'rotate-0'
                  }`}
                >
                  <div
                    style={{
                      background: `linear-gradient(to bottom, var(--dj-tonearm-pivot-from), var(--dj-tonearm-pivot-to))`,
                    }}
                    className="w-5 h-5 rounded-full border border-black/30 shadow ml-auto"
                  />
                  <div
                    style={{
                      background: `linear-gradient(to right, var(--dj-tonearm-shaft-from), var(--dj-tonearm-shaft-via), var(--dj-tonearm-shaft-to))`,
                    }}
                    className="w-1.5 h-24 mx-auto rounded-full shadow"
                  />
                  <div
                    style={{
                      background: `linear-gradient(to bottom right, var(--dj-tonearm-cart-from), var(--dj-tonearm-cart-to))`,
                    }}
                    className="w-3.5 h-5 rounded border border-zinc-500 mx-auto -mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Deck A Transport & Loop Controls */}
            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[var(--dj-border)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayA}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                    isPlayingA
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'
                  }`}
                >
                  {isPlayingA ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSeekA(0)}
                  className="px-3 py-2 rounded-xl bg-[var(--dj-bg-control)] hover:bg-[var(--dj-bg-control-hover)] text-[var(--dj-text-primary)] text-[11px] font-mono font-bold border border-[var(--dj-border)] cursor-pointer"
                >
                  CUE
                </button>

                <button
                  type="button"
                  onClick={() => toggleLoopA(4)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-mono font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                    loopActiveA
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                      : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] border-[var(--dj-border)] hover:text-[var(--dj-text-primary)]'
                  }`}
                >
                  <Repeat className="w-3 h-3" />
                  4-BEAT
                </button>
              </div>

              {/* Pitch Fader Slider */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[var(--dj-text-muted)]">PITCH</span>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.1"
                  value={pitchA}
                  onChange={(e) => setPitchA(parseFloat(e.target.value))}
                  className="w-20 accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 w-10 text-right">
                  {pitchA > 0 ? `+${pitchA}` : pitchA}%
                </span>
              </div>
            </div>
          </div>

          {/* CENTRAL HARDWARE MIXER (Cols 6-7) */}
          <div className={`${mobileConsoleTab === 'mixer' ? 'flex' : 'hidden lg:flex'} lg:col-span-2 bg-[var(--dj-bg-card-subtle)] rounded-2xl border border-[var(--dj-border)] p-3 sm:p-4 shadow-xl flex-col items-center justify-between gap-4 transition-colors`}>
            <div className="text-[10px] uppercase tracking-widest text-[var(--dj-text-secondary)] font-mono font-bold flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-emerald-500" />
              DSP MIXER
            </div>

            {/* Live Master VU Meter */}
            <div className="w-full flex items-center justify-center gap-1.5 py-1">
              <div className="w-3 h-20 bg-[var(--dj-vu-track)] rounded-md p-0.5 flex flex-col-reverse gap-0.5 border border-[var(--dj-border)]">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-full h-1 rounded-xs transition-colors ${
                      vuMaster > i * 8
                        ? i > 9
                          ? 'bg-rose-500'
                          : i > 7
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                        : 'bg-[var(--dj-vu-off)]'
                    }`}
                  />
                ))}
              </div>
              <div className="w-3 h-20 bg-[var(--dj-vu-track)] rounded-md p-0.5 flex flex-col-reverse gap-0.5 border border-[var(--dj-border)]">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-full h-1 rounded-xs transition-colors ${
                      vuMaster > i * 8
                        ? i > 9
                          ? 'bg-rose-500'
                          : i > 7
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                        : 'bg-[var(--dj-vu-off)]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* 3-Band EQ Rotary Controls */}
            <div className="w-full space-y-2.5 text-[10px] font-mono text-[var(--dj-text-secondary)]">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>HIGH</span>
                  <span>{eqHighA}dB</span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="10"
                  value={eqHighA}
                  onChange={(e) => setEqHighA(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>MID</span>
                  <span>{eqMidA}dB</span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="10"
                  value={eqMidA}
                  onChange={(e) => setEqMidA(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>LOW BASS</span>
                  <span>{eqLowA}dB</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="10"
                  value={eqLowA}
                  onChange={(e) => setEqLowA(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1"
                />
              </div>
            </div>

            {/* Headphone Cue Audition Buttons & Mic */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleCueA}
                title="Headphone Cue PFL Deck A"
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                  cueAActive
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow'
                    : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] border-[var(--dj-border)] hover:text-[var(--dj-text-primary)]'
                }`}
              >
                CUE A
              </button>

              <button
                type="button"
                onClick={() => setMicActive(!micActive)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
                  micActive
                    ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30 animate-pulse'
                    : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] border-[var(--dj-border)] hover:text-[var(--dj-text-primary)]'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleCueB}
                title="Headphone Cue PFL Deck B"
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                  cueBActive
                    ? 'bg-rose-500 text-white border-rose-400 shadow'
                    : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] border-[var(--dj-border)] hover:text-[var(--dj-text-primary)]'
                }`}
              >
                CUE B
              </button>
            </div>

            {/* Crossfader Unit */}
            <div className="w-full space-y-1 pt-2 border-t border-[var(--dj-border)]">
              <div className="flex justify-between text-[9px] font-mono font-bold">
                <span className="text-cyan-600 dark:text-cyan-400">DECK A</span>
                <span className="text-[var(--dj-text-muted)]">CROSSFADER</span>
                <span className="text-rose-600 dark:text-rose-400">DECK B</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.02"
                value={crossfader}
                onChange={(e) => setCrossfader(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-[var(--dj-bg-control)] rounded-lg border border-[var(--dj-border)]"
              />
            </div>
          </div>

          {/* DECK B VIRTUAL TURNTABLE (Cols 8-12) */}
          <div className={`${mobileConsoleTab === 'deckB' ? 'flex' : 'hidden lg:flex'} lg:col-span-5 bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] p-3 sm:p-4 shadow-xl flex-col justify-between relative overflow-hidden transition-colors`}>
            {/* Top Deck Info Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 font-mono">
                    DECK B
                  </span>
                  <span className="text-[14px] font-bold text-[var(--dj-text-primary)] truncate">
                    {deckBSong?.title || 'No Track Loaded'}
                  </span>
                </div>
                <div className="text-[12px] text-[var(--dj-text-secondary)] truncate mt-0.5">
                  {deckBSong?.artist || 'Select from Queue or Library below'}
                </div>
              </div>

              {/* BPM & Key badges */}
              <div className="flex items-center gap-1.5 font-mono text-[11px] flex-shrink-0">
                {deckBSong?.bpm ? (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/60 text-amber-600 dark:text-amber-400 border border-[var(--dj-border)] font-bold">
                    {deckBSong.bpm} BPM
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/60 text-[var(--dj-text-faint)] border border-[var(--dj-border)]">
                    -- BPM
                  </span>
                )}
                {deckBSong?.musicalKey ? (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/60 text-rose-600 dark:text-rose-400 border border-[var(--dj-border)] font-bold">
                    {deckBSong.musicalKey}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-black/10 dark:bg-black/60 text-[var(--dj-text-faint)] border border-[var(--dj-border)]">
                    -- KEY
                  </span>
                )}
              </div>
            </div>

            {/* Turntable Platter Visual & Tone-arm */}
            <div className="relative w-full aspect-square max-w-[280px] mx-auto my-2 flex items-center justify-center">
              {/* Outer Cast-aluminum Rim */}
              <div
                style={{
                  background: `linear-gradient(to bottom right, var(--dj-platter-outer-from), var(--dj-platter-outer-via), var(--dj-platter-outer-to))`,
                  borderColor: `var(--dj-platter-border)`,
                }}
                className="w-full h-full rounded-full p-2.5 shadow-2xl border relative transition-colors"
              >
                {/* Vinyl Record */}
                <div
                  className={`w-full h-full rounded-full relative shadow-inner flex items-center justify-center border border-black/80 ${
                    isPlayingB ? 'animate-[spin_2.8s_linear_infinite]' : ''
                  }`}
                  style={{
                    backgroundColor: `var(--dj-platter-vinyl)`,
                    backgroundImage:
                      'repeating-radial-gradient(circle, var(--dj-platter-vinyl) 0, var(--dj-platter-groove) 2px, var(--dj-platter-vinyl) 4px)',
                  }}
                >
                  {/* Vinyl Gloss Sheen Overlay */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 via-transparent to-white/15 pointer-events-none" />

                  {/* Center Vintage Label */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-900 via-red-700 to-rose-950 border-2 border-white/20 shadow-md flex flex-col items-center justify-center text-center p-2 relative">
                    <div className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-white/30 absolute" />
                    <span className="text-[8px] font-black uppercase tracking-wider text-white/80 mt-4">
                      DJQ B
                    </span>
                    <span className="text-[9px] font-bold text-white truncate w-full">
                      {deckBSong?.genre || 'CUE STEREO'}
                    </span>
                  </div>
                </div>

                {/* S-Shaped Tone-Arm Stylus */}
                <div
                  className={`absolute right-1 top-2 w-16 h-36 pointer-events-none transition-transform duration-700 origin-top-right ${
                    isPlayingB ? 'rotate-[18deg]' : 'rotate-0'
                  }`}
                >
                  <div
                    style={{
                      background: `linear-gradient(to bottom, var(--dj-tonearm-pivot-from), var(--dj-tonearm-pivot-to))`,
                    }}
                    className="w-5 h-5 rounded-full border border-black/30 shadow ml-auto"
                  />
                  <div
                    style={{
                      background: `linear-gradient(to right, var(--dj-tonearm-shaft-from), var(--dj-tonearm-shaft-via), var(--dj-tonearm-shaft-to))`,
                    }}
                    className="w-1.5 h-24 mx-auto rounded-full shadow"
                  />
                  <div
                    style={{
                      background: `linear-gradient(to bottom right, var(--dj-tonearm-cart-from), var(--dj-tonearm-cart-to))`,
                    }}
                    className="w-3.5 h-5 rounded border border-zinc-500 mx-auto -mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Deck B Transport & Loop Controls */}
            <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[var(--dj-border)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlayB}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                    isPlayingB
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20'
                  }`}
                >
                  {isPlayingB ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSeekB(0)}
                  className="px-3 py-2 rounded-xl bg-[var(--dj-bg-control)] hover:bg-[var(--dj-bg-control-hover)] text-[var(--dj-text-primary)] text-[11px] font-mono font-bold border border-[var(--dj-border)] cursor-pointer"
                >
                  CUE
                </button>

                <button
                  type="button"
                  onClick={() => toggleLoopB(4)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-mono font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                    loopActiveB
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                      : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] border-[var(--dj-border)] hover:text-[var(--dj-text-primary)]'
                  }`}
                >
                  <Repeat className="w-3 h-3" />
                  4-BEAT
                </button>
              </div>

              {/* Pitch Fader Slider */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[var(--dj-text-muted)]">PITCH</span>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.1"
                  value={pitchB}
                  onChange={(e) => setPitchB(parseFloat(e.target.value))}
                  className="w-20 accent-rose-500 cursor-pointer"
                />
                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 w-10 text-right">
                  {pitchB > 0 ? `+${pitchB}` : pitchB}%
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* INTEGRATED DUAL WAVEFORM STRIP (DIRECTLY UNDER CONSOLE) */}
        <div className="max-w-[1540px] mx-auto mt-4 pt-3.5 border-t border-[var(--dj-border)] grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Deck A Waveform */}
          <div className="bg-[var(--dj-bg-card-subtle)] rounded-xl border border-[var(--dj-border)] p-2.5 flex flex-col gap-1.5 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                DECK A WAVEFORM
              </span>
              <div className="flex items-center gap-2 text-[var(--dj-text-secondary)]">
                <span className="text-[var(--dj-text-primary)] font-bold">{formatTime(currTimeA)}</span>
                <span>/</span>
                <span>-{formatTime(Math.max(0, durationA - currTimeA))}</span>
              </div>
            </div>
            <div className="h-10 w-full relative">
              <WaveformCanvas
                peaks={deckASong?.waveformPeaks}
                progress={progressA}
                color={themeMode === 'light' ? '#0891b2' : '#00e5ff'}
                glowColor={themeMode === 'light' ? 'rgba(8, 145, 178, 0.25)' : 'rgba(0, 229, 255, 0.4)'}
                height={40}
                isLooping={loopActiveA}
                onSeek={handleSeekA}
              />
            </div>
          </div>

          {/* Deck B Waveform */}
          <div className="bg-[var(--dj-bg-card-subtle)] rounded-xl border border-[var(--dj-border)] p-2.5 flex flex-col gap-1.5 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                DECK B WAVEFORM
              </span>
              <div className="flex items-center gap-2 text-[var(--dj-text-secondary)]">
                <span className="text-[var(--dj-text-primary)] font-bold">{formatTime(currTimeB)}</span>
                <span>/</span>
                <span>-{formatTime(Math.max(0, durationB - currTimeB))}</span>
              </div>
            </div>
            <div className="h-10 w-full relative">
              <WaveformCanvas
                peaks={deckBSong?.waveformPeaks}
                progress={progressB}
                color={themeMode === 'light' ? '#e11d48' : '#ff3366'}
                glowColor={themeMode === 'light' ? 'rgba(225, 29, 72, 0.25)' : 'rgba(255, 51, 102, 0.4)'}
                height={40}
                isLooping={loopActiveB}
                onSeek={handleSeekB}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. WORKSPACE BOTTOM DOCK (REQUEST QUEUE & LOCAL MUSIC LIBRARY) */}
      <section className="flex-1 bg-[var(--dj-bg-dock)] p-3 sm:p-4 flex flex-col min-h-[440px] transition-colors">
        {/* Dock Selector Header */}
        <div className="flex items-center justify-between mb-3 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-max">
            <button
              type="button"
              onClick={() => setActiveDockTab('split')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeDockTab === 'split'
                  ? 'bg-[var(--dj-tab-active-bg)] text-[var(--dj-tab-active-text)] border border-[var(--dj-border)] shadow-sm'
                  : 'text-[var(--dj-tab-inactive-text)] hover:text-[var(--dj-tab-hover-text)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDockTab('requests')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeDockTab === 'requests'
                  ? 'bg-[var(--dj-tab-active-bg)] text-[var(--dj-tab-active-text)] border border-[var(--dj-border)] shadow-sm'
                  : 'text-[var(--dj-tab-inactive-text)] hover:text-[var(--dj-tab-hover-text)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Queue ({requests.filter(r => r.status === 'waiting' || r.status === 'accepted').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDockTab('library')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeDockTab === 'library'
                  ? 'bg-[var(--dj-tab-active-bg)] text-[var(--dj-tab-active-text)] border border-[var(--dj-border)] shadow-sm'
                  : 'text-[var(--dj-tab-inactive-text)] hover:text-[var(--dj-tab-hover-text)]'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5 text-cyan-500" />
              <span>DJ Crate</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDockTab('finances')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeDockTab === 'finances'
                  ? 'bg-[var(--dj-tab-active-bg)] text-emerald-600 dark:text-emerald-400 border border-[var(--dj-border)] shadow-sm'
                  : 'text-[var(--dj-tab-inactive-text)] hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Wallet &amp; Payouts</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDockTab('settings')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-[12px] font-bold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeDockTab === 'settings'
                  ? 'bg-[var(--dj-tab-active-bg)] text-cyan-600 dark:text-cyan-400 border border-[var(--dj-border)] shadow-sm'
                  : 'text-[var(--dj-tab-inactive-text)] hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Booth QR &amp; Rates</span>
            </button>
          </div>
        </div>

        {/* Dual Dock Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Finances View */}
          {activeDockTab === 'finances' && (
            <div className="h-full lg:col-span-12">
              <FinancesWalletView />
            </div>
          )}

          {/* Settings & Booth Pass View */}
          {activeDockTab === 'settings' && (
            <div className="h-full lg:col-span-12">
              <StudioSettingsProfileView />
            </div>
          )}

          {/* Request Queue Panel */}
          {(activeDockTab === 'split' || activeDockTab === 'requests') && (
            <div
              className={`h-full ${
                activeDockTab === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
              }`}
            >
              <RequestQueuePanel
                currentTrackA={deckASong}
                currentTrackB={deckBSong}
                onLoadRequestToDeck={(deck, req) => {
                  if (deck === 'A') {
                    setDeckASong(req.song);
                  } else {
                    setDeckBSong(req.song);
                  }
                }}
              />
            </div>
          )}

          {/* Music Library & Discovery Panel */}
          {(activeDockTab === 'split' || activeDockTab === 'library') && (
            <div
              className={`h-full ${
                activeDockTab === 'split' ? 'lg:col-span-6' : 'lg:col-span-12'
              }`}
            >
              <MusicLibraryPanel
                activeDeckATrackId={deckASong?.id}
                activeDeckBTrackId={deckBSong?.id}
                onLoadTrack={(deck, song) => {
                  if (deck === 'A') {
                    setDeckASong(song);
                  } else {
                    setDeckBSong(song);
                  }
                }}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
