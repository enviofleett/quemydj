'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCueApp } from '@/context/CueAppContext';
import { Song } from '@/types';
import { djAudioEngine } from '@/services/djAudioEngine';
import { WaveformCanvas } from '@/components/dj/WaveformCanvas';
import { RequestQueuePanel } from '@/components/dj/RequestQueuePanel';
import { MusicLibraryPanel } from '@/components/dj/MusicLibraryPanel';
import { FinancesWalletView } from '@/components/dj/FinancesWalletView';
import { StudioSettingsProfileView } from '@/components/dj/StudioSettingsProfileView';
import {
  Play,
  Pause,
  Sun,
  Moon,
  Power,
  Volume2,
  X,
  QrCode,
} from 'lucide-react';

type ConsoleTab = 'requests' | 'catalog' | 'finances' | 'booth_qr';

export default function DJBoothConsolePage() {
  const router = useRouter();
  const {
    currentDj,
    requests,
    themeMode,
    toggleThemeMode,
    logoutDj,
    updateDjSessionStatus,
  } = useCueApp();
  const isAccepting = currentDj.liveSession?.isAcceptingRequests ?? true;

  const [activeTab, setActiveTab] = useState<ConsoleTab>('requests');

  // On-demand Audio Player state (only visible when a track is actively loaded)
  const [bridgeSong, setBridgeSong] = useState<Song | null>(null);
  const [isPlayingBridge, setIsPlayingBridge] = useState(false);
  const [bridgeProgress, setBridgeProgress] = useState(0);
  const [bridgeCurrTime, setBridgeCurrTime] = useState(0);
  const [bridgeDuration, setBridgeDuration] = useState(0);
  const [bridgeVolume, setBridgeVolume] = useState(1.0);

  useEffect(() => {
    djAudioEngine.setMasterVolume(1.0);
    djAudioEngine.setDeckVolume('A', bridgeVolume);
  }, [bridgeVolume]);

  const handlePlayBridgeTrack = (song: Song) => {
    setBridgeSong(song);
    if (!song.previewUrl) return;

    djAudioEngine.playDeck(
      'A',
      song.previewUrl,
      (pct, curr, dur) => {
        setBridgeProgress(pct);
        setBridgeCurrTime(Math.floor(curr));
        setBridgeDuration(Math.floor(dur));
      },
      () => setIsPlayingBridge(false)
    );
    setIsPlayingBridge(true);
  };

  const handlePauseBridgeTrack = () => {
    djAudioEngine.pauseDeck('A');
    setIsPlayingBridge(false);
  };

  const handleClearBridge = () => {
    djAudioEngine.pauseDeck('A');
    setIsPlayingBridge(false);
    setBridgeSong(null);
    setBridgeProgress(0);
    setBridgeCurrTime(0);
    setBridgeDuration(0);
  };

  const handleSeekBridge = (pct: number) => {
    setBridgeProgress(pct);
    const targetSeconds = (pct / 100) * bridgeDuration;
    setBridgeCurrTime(Math.floor(targetSeconds));
    djAudioEngine.seekDeck('A', targetSeconds);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeIncomingCount = requests.filter(
    (r) =>
      r.status === 'waiting' ||
      r.status === 'new_request' ||
      r.status === 'accepted' ||
      r.status === 'preparing'
  ).length;

  const playedCount = requests.filter((r) => r.status === 'played').length;

  const totalEarnedToday = requests
    .filter((r) => r.status === 'played')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const basePrice = currentDj.liveSession?.basePrice ?? 5000;
  const heroBgImage =
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop';

  const navItems: { id: ConsoleTab; label: string; count?: number }[] = [
    { id: 'requests', label: 'Queue', count: activeIncomingCount },
    { id: 'catalog', label: 'Catalog' },
    { id: 'finances', label: 'Payouts' },
    { id: 'booth_qr', label: 'Booth QR' },
  ];

  return (
    <div className="min-h-[100dvh] bg-[var(--dj-bg-main)] text-[var(--dj-text-primary)] flex flex-col font-sans antialiased transition-colors">
      {/* 1. HEADER */}
      <header className="h-14 px-4 sm:px-6 bg-[var(--dj-bg-header)] border-b border-[var(--dj-border)] flex items-center justify-between gap-3 sticky top-0 z-30">
        {/* Left: Brand & Venue */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[var(--dj-border)] bg-zinc-950 flex items-center justify-center">
              <Image
                src="/brand-logo-transparent.png"
                alt="QueMyDJ"
                width={28}
                height={28}
                className="object-contain p-0.5"
              />
            </div>
            <span className="font-semibold text-[15px] tracking-[-0.02em] text-[var(--dj-text-primary)]">
              QueMyDJ
            </span>
          </Link>

          <span className="hidden md:block h-4 w-px bg-[var(--dj-border)]" />

          <span className="hidden md:inline text-[13px] font-medium text-[var(--dj-text-secondary)] truncate">
            {currentDj.currentVenue.name}
          </span>
        </div>

        {/* Right: Booth Status Toggle, Earnings, Theme & Account */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={isAccepting}
            onClick={() => updateDjSessionStatus(!isAccepting)}
            className="h-8 px-2.5 rounded-lg border border-[var(--dj-border)] bg-[var(--dj-bg-card-subtle)] hover:bg-[var(--dj-bg-control)] flex items-center gap-2 text-[12px] font-medium text-[var(--dj-text-primary)] transition-colors cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isAccepting ? 'bg-emerald-500' : 'bg-zinc-400'
              }`}
            />
            <span>{isAccepting ? 'On Duty' : 'Off Duty'}</span>
          </button>

          <span className="hidden sm:inline text-[12px] font-mono font-semibold tabular-nums text-[var(--dj-text-primary)] pl-1">
            ₦{totalEarnedToday.toLocaleString()}
          </span>

          <button
            type="button"
            onClick={toggleThemeMode}
            aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-lg hover:bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] hover:text-[var(--dj-text-primary)] border border-[var(--dj-border)] flex items-center justify-center transition-colors cursor-pointer"
          >
            {themeMode === 'dark' ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              logoutDj();
              router.push('/login');
            }}
            aria-label="Sign out"
            title="Sign out"
            className="w-8 h-8 rounded-lg hover:bg-rose-500/10 text-[var(--dj-text-secondary)] hover:text-rose-500 border border-[var(--dj-border)] hover:border-rose-500/30 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. EDITORIAL BOOTH HERO BANNER (1:1 Square Poster) */}
      <section className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5 pb-4 flex justify-center">
        <div className="relative w-full max-w-[380px] aspect-square rounded-2xl overflow-hidden border border-[var(--dj-border)] bg-zinc-950 text-white flex flex-col justify-between p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {/* Full-bleed atmospheric booth photography */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url('${heroBgImage}')` }}
          />
          {/* Editorial top & bottom vignette for clear legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/65 via-zinc-950/20 to-zinc-950/95" />

          {/* Top Bar: Status & Booth QR Action */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-950/65 backdrop-blur-md border border-white/15 text-[11px] font-mono uppercase tracking-wider text-zinc-100">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAccepting ? 'bg-emerald-400' : 'bg-zinc-400'
                }`}
              />
              <span>{isAccepting ? 'On Duty' : 'Off Duty'}</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('booth_qr')}
              className="h-8 px-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-[12px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Booth QR</span>
            </button>
          </div>

          {/* Bottom Anchor: DJ Identity & Live Session Metrics */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/25 shrink-0 bg-zinc-900">
                <Image
                  src={currentDj.avatarUrl}
                  alt={currentDj.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 truncate">
                  {currentDj.currentVenue.name}
                </div>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white leading-tight truncate mt-0.5">
                  {currentDj.name}
                </h1>
                <p className="text-[12px] text-zinc-300 truncate mt-0.5">
                  Min. request ₦{basePrice.toLocaleString()} · {currentDj.handle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 pt-3.5 border-t border-white/15">
              <div>
                <div className="text-[11px] text-zinc-400">In Queue</div>
                <div className="text-[17px] font-semibold font-mono tabular-nums text-white mt-0.5">
                  {activeIncomingCount}
                </div>
              </div>
              <div className="border-l border-white/15 pl-4">
                <div className="text-[11px] text-zinc-400">Played</div>
                <div className="text-[17px] font-semibold font-mono tabular-nums text-white mt-0.5">
                  {playedCount}
                </div>
              </div>
              <div className="border-l border-white/15 pl-4">
                <div className="text-[11px] text-zinc-400">Earned</div>
                <div className="text-[17px] font-semibold font-mono tabular-nums text-emerald-400 mt-0.5">
                  ₦{totalEarnedToday.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. NAVIGATION BAR */}
      <div className="bg-[var(--dj-bg-header)] border-y border-[var(--dj-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <nav
            aria-label="Console views"
            className="flex items-center gap-6 overflow-x-auto scrollbar-none -mb-px"
          >
            {navItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
                    isActive
                      ? 'border-[var(--dj-text-primary)] text-[var(--dj-text-primary)]'
                      : 'border-transparent text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums leading-none ${
                        isActive
                          ? 'bg-[var(--dj-text-primary)] text-[var(--dj-bg-header)]'
                          : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3. MAIN CONTENT */}
      <main
        className={`flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col ${
          bridgeSong ? 'pb-24' : ''
        }`}
      >
        {activeTab === 'requests' && (
          <RequestQueuePanel
            activeBridgeSong={bridgeSong}
            isPlayingBridge={isPlayingBridge}
            onPlayBridgeTrack={handlePlayBridgeTrack}
            onPauseBridgeTrack={handlePauseBridgeTrack}
          />
        )}

        {activeTab === 'catalog' && (
          <MusicLibraryPanel
            activeDeckATrackId={bridgeSong?.id}
            activeDeckBTrackId={undefined}
            onLoadTrack={(_deck, song) => {
              handlePlayBridgeTrack(song);
            }}
          />
        )}

        {activeTab === 'finances' && <FinancesWalletView />}

        {activeTab === 'booth_qr' && <StudioSettingsProfileView />}
      </main>

      {/* 4. ON-DEMAND AUDIO PLAYER (Hidden until DJ plays a track) */}
      {bridgeSong && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--dj-bg-header)] border-t border-[var(--dj-border)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() =>
                  isPlayingBridge
                    ? handlePauseBridgeTrack()
                    : handlePlayBridgeTrack(bridgeSong)
                }
                aria-label={isPlayingBridge ? 'Pause' : 'Play'}
                className="w-8 h-8 rounded-full bg-[var(--dj-text-primary)] text-[var(--dj-bg-header)] hover:opacity-90 flex items-center justify-center shrink-0 transition-opacity cursor-pointer"
              >
                {isPlayingBridge ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <div className="relative w-8 h-8 rounded-md overflow-hidden bg-[var(--dj-bg-control)] shrink-0 border border-[var(--dj-border)]">
                <Image
                  src={bridgeSong.coverUrl}
                  alt={bridgeSong.title}
                  width={32}
                  height={32}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[var(--dj-text-primary)] truncate leading-tight">
                  {bridgeSong.title}
                </div>
                <div className="text-[11px] text-[var(--dj-text-muted)] truncate">
                  {bridgeSong.artist}
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3 flex-1 max-w-md">
              <span className="text-[11px] font-mono tabular-nums text-[var(--dj-text-muted)] w-9 text-right">
                {formatSeconds(bridgeCurrTime)}
              </span>
              <div className="h-6 flex-1 relative">
                <WaveformCanvas
                  peaks={bridgeSong.waveformPeaks}
                  progress={bridgeProgress}
                  color={themeMode === 'light' ? '#09090b' : '#fafafa'}
                  glowColor={
                    themeMode === 'light'
                      ? 'rgba(9, 9, 11, 0.12)'
                      : 'rgba(250, 250, 250, 0.2)'
                  }
                  height={24}
                  isLooping={false}
                  onSeek={handleSeekBridge}
                />
              </div>
              <span className="text-[11px] font-mono tabular-nums text-[var(--dj-text-muted)] w-9">
                {formatSeconds(bridgeDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[var(--dj-text-muted)]" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bridgeVolume}
                  onChange={(e) => setBridgeVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                  className="w-16 accent-[var(--dj-text-primary)] cursor-pointer h-1"
                />
              </div>
              <button
                type="button"
                onClick={handleClearBridge}
                aria-label="Close player"
                className="w-7 h-7 rounded-md hover:bg-[var(--dj-bg-control)] text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
