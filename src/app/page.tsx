'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { DJ, Song } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LiveQrCameraScanner } from '@/components/qr/LiveQrCameraScanner';
import { calculateQueueEta } from '@/utils/queueEta';
import { Drawer } from 'vaul';
import {
  Camera,
  Search,
  Music,
  Star,
  CheckCircle2,
  Play,
  X,
  CreditCard,
  ShieldCheck,
  ThumbsUp,
  ArrowUpRight,
  ChevronRight,
  Check,
  Bell,
  Sun,
  Moon,
  Bluetooth,
  Radio,
  Sparkles,
  QrCode
} from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function MobileSocialHomePage() {
  const { currentDj, djs, songs, requests, createRequest, provideRequestFeedback, themeMode, toggleThemeMode } = useCueApp();

  // State: QR Scanner Sheet & DJ Profile Sheet
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [activeScannedDj, setActiveScannedDj] = useState<DJ | null>(null);

  // State: Song selection & Payment inside DJ sheet
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [searchSourceTab, setSearchSourceTab] = useState<'all' | 'official' | 'youtube'>('all');
  const [guestName, setGuestName] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState<Song[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [activePreviewSongId, setActivePreviewSongId] = useState<string | null>(null);
  const audioPreviewRef = React.useRef<HTMLAudioElement | null>(null);

  // Proximity Detection simulation (BLE / Bluetooth Beacon in Venue)
  const [nearbyDjDetected, setNearbyDjDetected] = useState<DJ | null>(currentDj || djs[0] || null);
  const [isScanningBluetooth, setIsScanningBluetooth] = useState<boolean>(false);
  const [homeDjSearch, setHomeDjSearch] = useState<string>('');

  // Live Music Search API Integration (iTunes + YouTube)
  useEffect(() => {
    if (!songSearchQuery.trim()) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const res = await fetch(
          `/api/music/search?q=${encodeURIComponent(songSearchQuery.trim())}&type=${searchSourceTab}`
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          setApiSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('API search failed:', err);
      } finally {
        if (isMounted) setIsSearchingApi(false);
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [songSearchQuery, searchSourceTab]);

  const toggleAudioPreview = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.previewUrl) return;

    if (activePreviewSongId === song.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setActivePreviewSongId(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(song.previewUrl);
      audioPreviewRef.current = audio;
      audio.play().catch(() => {});
      setActivePreviewSongId(song.id);
      audio.onended = () => setActivePreviewSongId(null);
    }
  };

  // Clean up audio on unmount or drawer close
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  // Filter requests belonging to this guest
  const [statusFilter, setStatusFilter] = useState<'all' | 'playing' | 'waiting' | 'played'>('all');

  // Song suggestions when DJ profile is open (Combines live API search + mock catalog)
  const availableSongs = useMemo(() => {
    if (songSearchQuery.trim()) {
      if (apiSearchResults.length > 0) return apiSearchResults;
      const q = songSearchQuery.toLowerCase().trim();
      return songs.filter((s) => {
        const match = s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
        const genreMatch =
          selectedGenre === 'All' || s.genre.toLowerCase() === selectedGenre.toLowerCase();
        return match && genreMatch;
      });
    }

    return songs.filter(
      (s) => selectedGenre === 'All' || s.genre.toLowerCase() === selectedGenre.toLowerCase()
    );
  }, [songs, songSearchQuery, selectedGenre, apiSearchResults]);

  const guestRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter === 'playing') return r.status === 'playing';
      if (statusFilter === 'waiting') return r.status === 'waiting' || r.status === 'accepted';
      if (statusFilter === 'played') return r.status === 'played' || r.status === 'declined';
      return true;
    });
  }, [requests, statusFilter]);

  const handleResolveCode = useCallback(
    (rawInput: string) => {
      const trimmed = rawInput.trim();
      let candidateCode = trimmed.toUpperCase();

      // Support full QR URLs such as https://.../booth=SKY99 or ?code=PULSE
      try {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          const parsedUrl = new URL(trimmed);
          const boothParam =
            parsedUrl.searchParams.get('booth') || parsedUrl.searchParams.get('code');
          if (boothParam) {
            candidateCode = boothParam.trim().toUpperCase();
          }
        }
      } catch {}

      const normalizedQuery = trimmed.toLowerCase();

      // Match by passcode, ID, handle, or DJ name
      const foundDj =
        djs.find(
          (d) =>
            d.liveSession?.passcode.toUpperCase() === candidateCode ||
            d.id.toUpperCase() === candidateCode ||
            d.handle.replace('@', '').toUpperCase() === candidateCode ||
            d.name.toLowerCase().includes(normalizedQuery) ||
            d.currentVenue.name.toLowerCase().includes(normalizedQuery)
        ) || currentDj;

      setActiveScannedDj(foundDj);
      setShowScannerModal(false);
      setManualCode('');
    },
    [djs, currentDj]
  );

  // Auto-open DJ Booth Profile when guest arrives from a physical QR link (/?booth=SKY99)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const boothCode = params.get('booth') || params.get('code');
    if (boothCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleResolveCode(boothCode);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [handleResolveCode]);

  const handleSimulateScan = (dj: DJ) => {
    setActiveScannedDj(dj);
    setShowScannerModal(false);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSong || !activeScannedDj?.liveSession) return;

    setIsPaying(true);

    setTimeout(() => {
      setIsPaying(false);

      createRequest({
        sessionId: activeScannedDj.liveSession!.id,
        djId: activeScannedDj.id,
        song: selectedSong,
        guestName: guestName.trim() || 'Guest',
        guestNote: guestNote.trim() || undefined,
        amount: activeScannedDj.liveSession!.basePrice,
        tip: 0,
        paymentMethod: 'Apple Pay',
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.65 },
        });
      } catch {}

      setPaymentSuccess(true);
      setSelectedSong(null);
      setSongSearchQuery('');
      setGuestNote('');

      // Auto-return to home page after 1.8s so guest immediately sees their queued song
      setTimeout(() => {
        setPaymentSuccess(false);
        setActiveScannedDj(null);
        // Scroll smoothly to the live requests section
        const reqEl = document.getElementById('your-requests-section');
        if (reqEl) {
          reqEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 1800);
    }, 650);
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#090a0d] text-zinc-950 dark:text-zinc-100 transition-colors duration-200">
      {/* 1. NATIVE STICKY HEADER */}
      <header className="px-5 h-14 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#090a0d]/90 backdrop-blur-xl z-20 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center flex-shrink-0 shadow-xs border border-zinc-200/40 dark:border-white/10">
            <img
              src="/brand-logo-transparent.png"
              alt="QUEMYDJ Logo"
              className="w-full h-full object-contain p-0.5"
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-[17px] tracking-tight text-zinc-950 dark:text-white">QUEMYDJ</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/requests"
            aria-label="View notifications and requests"
            title="Notifications"
            className="relative w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {requests.some((r) => r.status === 'waiting' || r.status === 'accepted' || r.status === 'playing') && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#090a0d]" />
            )}
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT (Strict 20px / px-5 horizontal alignment) */}
      <main className="px-5 pt-4 pb-6 space-y-6">
        {/* 2. CENTRAL CLUBBING & HARDWARE SCANNER CARD */}
        <section className="relative overflow-hidden rounded-[24px] bg-zinc-950 text-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.22)] border border-white/[0.08]">
          {/* Atmospheric Clubbing Backdrop */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 pointer-events-none"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-[#061814]/85 to-[#040d0a]/95 pointer-events-none" />
          
          {/* Precision Architectural Speaker Driver (No Box, Matte Hardware Transducer) */}
          <div className="absolute -right-8 -top-8 w-56 h-56 pointer-events-none select-none opacity-90">
            <svg
              viewBox="0 0 240 240"
              className="w-full h-full animate-speaker-cone origin-center"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="matteCone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#27272a" />
                  <stop offset="55%" stopColor="#18181b" />
                  <stop offset="100%" stopColor="#09090b" />
                </radialGradient>
                <radialGradient id="centerDome" cx="40%" cy="38%" r="60%">
                  <stop offset="0%" stopColor="#3f3f46" />
                  <stop offset="65%" stopColor="#18181b" />
                  <stop offset="100%" stopColor="#09090b" />
                </radialGradient>
              </defs>

              <circle cx="120" cy="120" r="106" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
              <circle cx="120" cy="120" r="94" fill="url(#matteCone)" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
              <circle cx="120" cy="120" r="76" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <circle cx="120" cy="120" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <circle cx="120" cy="120" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <circle cx="120" cy="120" r="28" fill="url(#centerDome)" stroke="rgba(16,185,129,0.45)" strokeWidth="1.5" />
              <circle cx="120" cy="120" r="4" fill="#10b981" />
            </svg>
          </div>

          <div className="relative z-10">
            {/* Primary Copy */}
            <div className="space-y-1.5 max-w-[245px]">
              <h1 className="text-[22px] font-bold tracking-tight text-white leading-tight">
                Connect to the DJ
              </h1>
              <p className="text-[13px] text-zinc-400 leading-relaxed">
                Scan booth QR, search by DJ handle, or auto-connect via proximity.
              </p>
            </div>

            {/* Direct Quick Search Input Bar on Hero Card */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (homeDjSearch.trim()) {
                  handleResolveCode(homeDjSearch.trim());
                  setHomeDjSearch('');
                }
              }}
              className="mt-4 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/15"
            >
              <div className="flex-1 flex items-center pl-3 gap-2">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={homeDjSearch}
                  onChange={(e) => setHomeDjSearch(e.target.value)}
                  placeholder="DJ handle, name, or code..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-zinc-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!homeDjSearch.trim()}
                className="h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-xs font-bold transition-all cursor-pointer"
              >
                Find
              </button>
            </form>

            {/* Primary Scan Button */}
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="mt-3 w-full h-11 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 stroke-[2.25]" />
              <span>Scan Booth QR Code</span>
            </button>
          </div>
        </section>

        {/* 2.5 PROXIMITY TRACKING CARD: AUTOMATICALLY DETECTS DJ IN THE BUILDING */}
        {nearbyDjDetected && (
          <section className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 dark:border-emerald-500/20 shadow-md">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/20 flex items-center justify-center">
                  <Bluetooth className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                <span>DJ Detected in the Building</span>
              </div>
              <span className="text-[10px] font-semibold text-white bg-white/15 border border-white/25 px-2 py-0.5 rounded-full">
                Nearby (~3m)
              </span>
            </div>

            <div
              onClick={() => handleSimulateScan(nearbyDjDetected)}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-zinc-800/90 border border-black/[0.06] dark:border-zinc-700/60 shadow-xs cursor-pointer hover:border-emerald-500/50 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={nearbyDjDetected.avatarUrl}
                  alt={nearbyDjDetected.name}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                      {nearbyDjDetected.name}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {nearbyDjDetected.handle}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {nearbyDjDetected.currentVenue.name} &bull; <span className="text-emerald-600 dark:text-emerald-400 font-semibold">₦{(nearbyDjDetected.liveSession?.basePrice || 5000).toLocaleString()}/track</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex-shrink-0">
                <span>View Booth</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </section>
        )}

        {/* 3. YOUR SONG REQUESTS (Clean iOS Grouped Section & Single-Surface Cards) */}
        <section id="your-requests-section" className="space-y-3.5 scroll-mt-20">
          {/* Section Header */}
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-zinc-950 dark:text-white">
                Your Requests
              </h2>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Live queue status and playback updates
              </p>
            </div>
            <span className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
              {guestRequests.length} {guestRequests.length === 1 ? 'song' : 'songs'}
            </span>
          </div>

          {/* Native iOS Segmented Control */}
          <div
            role="tablist"
            aria-label="Filter song requests"
            className="grid grid-flow-col auto-cols-fr p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-transparent dark:border-zinc-800/80"
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'playing', label: 'Playing' },
              { id: 'waiting', label: 'In Queue' },
              { id: 'played', label: 'Played' },
            ].map((tab) => {
              const isCurrent = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isCurrent}
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`h-8 rounded-[9px] text-[13px] transition-all flex items-center justify-center select-none ${
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

          {/* Request Cards List — Zero Nested Gray Boxes */}
          <div className="space-y-3 pt-0.5">
            {guestRequests.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.06] dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40 p-8 text-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mx-auto mb-2">
                  <Music className="w-5 h-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white">No requests yet</h3>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 max-w-[230px] mx-auto leading-relaxed">
                  Scan a DJ booth QR code above to request a song and follow its live status.
                </p>
              </div>
            ) : (
              guestRequests.map((req) => {
                const isPlaying = req.status === 'playing';
                const queueEta = calculateQueueEta(req, requests);
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
                        ? 'bg-white dark:bg-zinc-900 border border-emerald-500/40 ring-1 ring-emerald-500/15 shadow-[0_2px_12px_rgba(16,185,129,0.08)]'
                        : 'bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs'
                    }`}
                  >
                    {/* Top Row: Track & DJ Artwork, Song Metadata, Price & Status */}
                    <div className="flex items-center gap-3.5">
                      {/* Album / DJ Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={req.song.coverUrl || req.djAvatar}
                          alt={req.song.title}
                          className="w-12 h-12 rounded-xl object-cover ring-1 ring-black/[0.06] dark:ring-white/10"
                        />
                        {isPlaying && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center">
                            <Play className="w-2 h-2 fill-white text-white ml-0.5" />
                          </span>
                        )}
                      </div>

                      {/* Main Track Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <h3 className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                            {req.song.title}
                          </h3>
                          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tabular-nums flex-shrink-0">
                            {req.song.duration}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {req.song.artist}
                        </p>
                      </div>

                      {/* Price & Status Pill */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-bold text-zinc-950 dark:text-white tabular-nums">
                          ₦{req.total.toLocaleString()}
                        </span>
                        <StatusBadge status={req.status} size="sm" />
                      </div>
                    </div>

                    {/* Middle Detail Strip: DJ Info & Queue Live ETA in One Clean Row */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 truncate">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-200">{req.djName}</span>
                        <span className="text-zinc-300 dark:text-zinc-600">&bull;</span>
                        <span className="truncate">{req.venueName}</span>
                      </div>

                      {queueEta && !isPlaying && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-[11px] font-semibold text-amber-900 dark:text-amber-300 border border-amber-500/20 tabular-nums">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>#{queueEta.position} in queue &bull; {queueEta.formattedEta}</span>
                        </div>
                      )}

                      {isPlaying && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>Currently Playing</span>
                        </div>
                      )}
                    </div>

                    {/* Optional Guest Note or Decline Reason */}
                    {req.guestNote && (
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 italic">
                        &ldquo;{req.guestNote}&rdquo;
                      </p>
                    )}

                    {req.declineReason && (
                      <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                        Declined: {req.declineReason} &bull; Refunded
                      </p>
                    )}

                    {/* Footer Hairline: Timestamp & Feedback action */}
                    <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                      <span>Requested {createdTime}</span>

                      {req.status === 'played' && !req.feedbackGiven && (
                        <button
                          type="button"
                          onClick={() => provideRequestFeedback(req.id, 'played_confirmed')}
                          className="h-6 px-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-900 dark:text-zinc-100 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors active:scale-95 cursor-pointer"
                        >
                          <ThumbsUp className="w-3 h-3 text-emerald-600" />
                          <span>Confirm Heard</span>
                        </button>
                      )}

                      {req.status === 'played' && req.feedbackGiven && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Verified Heard</span>
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* 4. NATIVE VAUL SHEET: QR CAMERA SCANNER & PASSCODE ENTRY */}
      <Drawer.Root open={showScannerModal} onOpenChange={setShowScannerModal}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" />
          <Drawer.Content
            aria-labelledby="scanner-sheet-title"
            className="bg-white dark:bg-[#0c0d12] text-zinc-950 dark:text-zinc-100 border-t border-transparent dark:border-zinc-800 flex flex-col rounded-t-[28px] max-h-[88dvh] fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 focus:outline-none shadow-2xl"
          >
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
            </div>

            <div className="p-5 pb-8 space-y-5 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <Drawer.Title
                    id="scanner-sheet-title"
                    className="text-[18px] font-bold tracking-tight text-zinc-950 dark:text-white"
                  >
                    Connect to Booth
                  </Drawer.Title>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                    Scan the QR to connect to the DJ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScannerModal(false)}
                  aria-label="Close scanner"
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live WebRTC Camera QR Scanner */}
              <LiveQrCameraScanner onScanSuccess={handleResolveCode} />

              {/* Quick Demo Venue Selector */}
              <div className="space-y-2">
                <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 block">
                  Live resident DJs performing tonight (Tap to view booth)
                </span>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-black/[0.07] dark:border-zinc-800 overflow-hidden">
                  {djs.slice(0, 3).map((dj) => (
                    <button
                      key={dj.id}
                      type="button"
                      onClick={() => handleSimulateScan(dj)}
                      className="w-full p-3.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={dj.avatarUrl}
                          alt={dj.name}
                          className="w-11 h-11 rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14px] font-semibold text-zinc-900 dark:text-white truncate">
                              {dj.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                              {dj.handle}
                            </span>
                          </div>
                          <div className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {dj.currentVenue.name} &bull; <span className="text-emerald-700 dark:text-emerald-400 font-medium">₦{(dj.liveSession?.basePrice || 5000).toLocaleString()}/track</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                        {dj.liveSession?.passcode || 'LIVE'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Search & DJ Name / Handle / Passcode Entry */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 block">
                  Search DJ or enter booth passcode
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleResolveCode(manualCode);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="DJ name, @handle or code (e.g. DJ Kofi, SKY99)"
                    className="flex-1 h-11 px-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="h-11 px-5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-[14px] font-semibold rounded-xl disabled:opacity-40 transition-opacity cursor-pointer"
                  >
                    Connect
                  </button>
                </form>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* 5. NATIVE VAUL BOTTOM SHEET: DJ SOCIAL PROFILE & SONG CATALOG */}
      <Drawer.Root
        open={Boolean(activeScannedDj)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveScannedDj(null);
            setSelectedSong(null);
          }
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" />
          <Drawer.Content
            aria-labelledby="dj-profile-sheet-title"
            className="bg-white dark:bg-[#0c0d12] text-zinc-950 dark:text-zinc-100 border-t border-transparent dark:border-zinc-800 flex flex-col rounded-t-[28px] max-h-[90dvh] fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 focus:outline-none shadow-2xl"
          >
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
              <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
            </div>

            {activeScannedDj && (
              <div className="p-5 pb-8 overflow-y-auto space-y-5">
                {/* DJ Profile Header: Name, Handle, Venue, Bio, Pricing & Rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={activeScannedDj.avatarUrl}
                      alt={activeScannedDj.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-black/10 dark:ring-white/10 flex-shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Drawer.Title
                          id="dj-profile-sheet-title"
                          className="text-[19px] font-bold tracking-tight text-zinc-950 dark:text-white truncate"
                        >
                          {activeScannedDj.name}
                        </Drawer.Title>
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {activeScannedDj.rating}
                        </span>
                      </div>
                      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                        {activeScannedDj.handle} &bull; {activeScannedDj.currentVenue.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[12px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 tabular-nums">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>
                          Live Booth Active &bull; ₦{(activeScannedDj.liveSession?.basePrice || 5000).toLocaleString()} / song request
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveScannedDj(null)}
                    aria-label="Close DJ sheet"
                    className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* About the DJ & Night Rotation Card */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 block">
                    About Resident Performer
                  </span>
                  <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {activeScannedDj.bio}
                  </p>
                  
                  {/* Genres Played Tonight */}
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">
                      Genres in Tonight's Rotation:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeScannedDj.genres.map((g) => (
                        <span
                          key={g}
                          className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 text-zinc-800 dark:text-zinc-200 shadow-2xs"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {paymentSuccess ? (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 text-zinc-900 dark:text-zinc-100 text-center space-y-2 border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                    <h4 className="text-[16px] font-bold">Request Sent to Booth</h4>
                    <p className="text-[13px] text-zinc-600 dark:text-zinc-300">
                      {activeScannedDj.name} received your request. Track its live status on your home screen.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    {/* iOS Spotlight-Style Search Bar & Dual Source Filter */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        <input
                          type="text"
                          value={songSearchQuery}
                          onChange={(e) => setSongSearchQuery(e.target.value)}
                          placeholder="Search any song, artist, remix, or edit..."
                          className="w-full h-11 pl-10 pr-9 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-700 transition-all"
                        />
                        {songSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSongSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Source Filter Segment: All / Official Streaming / YouTube Remixes */}
                      <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-lg text-[12px] font-medium">
                        {[
                          { id: 'all', label: 'All Catalog' },
                          { id: 'official', label: 'Streaming' },
                          { id: 'youtube', label: 'YouTube Remixes' },
                        ].map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSearchSourceTab(s.id as typeof searchSourceTab)}
                            className={`flex-1 py-1 rounded-md transition-all ${
                              searchSourceTab === s.id
                                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-semibold shadow-xs'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Genre Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {['All', 'Reggae', 'Afrobeats', 'Amapiano', 'Hip-Hop', 'House'].map(
                        (genre) => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => setSelectedGenre(genre)}
                            className={`h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                              selectedGenre === genre
                                ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-semibold'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/80'
                            }`}
                          >
                            {genre}
                          </button>
                        )
                      )}
                    </div>

                    {/* Apple Music & YouTube Live Track List */}
                    <div className="rounded-2xl border border-black/[0.07] dark:border-zinc-800 max-h-60 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900/60">
                      {isSearchingApi ? (
                        <div className="p-6 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
                          Searching global catalog & YouTube...
                        </div>
                      ) : availableSongs.length === 0 ? (
                        <div className="p-6 text-center text-[13px] text-zinc-500 dark:text-zinc-400">
                          No songs matching &ldquo;{songSearchQuery}&rdquo;
                        </div>
                      ) : (
                        availableSongs.map((song) => {
                          const isSelected = selectedSong?.id === song.id;
                          const isPreviewing = activePreviewSongId === song.id;

                          return (
                            <div
                              key={song.id}
                              onClick={() => setSelectedSong(song)}
                              className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                                isSelected ? 'bg-zinc-50 dark:bg-zinc-800/70' : 'hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40'
                              }`}
                            >
                              {/* Album / YouTube Art with 30s Play Preview Trigger */}
                              <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 group">
                                <img
                                  src={song.coverUrl}
                                  alt={song.title}
                                  className="w-full h-full object-cover ring-1 ring-black/10 dark:ring-white/10"
                                />
                                {song.previewUrl && (
                                  <button
                                    type="button"
                                    onClick={(e) => toggleAudioPreview(song, e)}
                                    title="Play 30-second snippet"
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white transition-opacity"
                                  >
                                    <Play className={`w-4 h-4 fill-white ${isPreviewing ? 'text-emerald-400 fill-emerald-400 scale-110' : ''}`} />
                                  </button>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="text-[14px] font-semibold text-zinc-900 dark:text-white truncate">
                                    {song.title}
                                  </div>
                                  {song.source === 'youtube' && (
                                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.2 rounded flex-shrink-0">
                                      YT
                                    </span>
                                  )}
                                </div>
                                <div className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                  {song.artist} · <span className="tabular-nums font-medium">{song.duration}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 flex-shrink-0">
                                <span className="text-[14px] font-semibold text-zinc-900 dark:text-white tabular-nums">
                                  ₦{(activeScannedDj.liveSession?.basePrice || 5000).toLocaleString()}
                                </span>
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'bg-zinc-950 dark:bg-emerald-500 text-white dark:text-black'
                                      : 'border border-zinc-300 dark:border-zinc-700 text-transparent'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Clean Native Checkout Form */}
                    {selectedSong && (
                      <form
                        onSubmit={handleSubmitRequest}
                        className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-[12px] font-medium text-zinc-400 dark:text-zinc-500 block">
                              Selected Song
                            </span>
                            <div className="text-[15px] font-semibold text-zinc-900 dark:text-white truncate">
                              {selectedSong.title} · {selectedSong.artist}
                            </div>
                          </div>
                          <span className="text-[17px] font-bold text-zinc-950 dark:text-white tabular-nums">
                            ₦{(activeScannedDj.liveSession?.basePrice || 5000).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="Your name or table (optional)"
                            className="w-full h-11 px-3.5 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-700"
                          />
                          <input
                            type="text"
                            value={guestNote}
                            onChange={(e) => setGuestNote(e.target.value)}
                            placeholder="Add a dedication or note for the DJ (optional)"
                            className="w-full h-11 px-3.5 bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 rounded-xl text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-700"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[12px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                          <span className="inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Auto-refunded if not played</span>
                          </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Paystack / Cards</span>
                        </div>

                        <button
                          type="submit"
                          disabled={isPaying}
                          className="w-full h-12 bg-zinc-950 dark:bg-emerald-500 hover:bg-zinc-800 dark:hover:bg-emerald-400 text-white dark:text-black font-semibold text-[15px] rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all tabular-nums cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>
                            {isPaying
                              ? 'Authorizing...'
                              : `Pay ₦${(activeScannedDj.liveSession?.basePrice || 5000).toLocaleString()} with Paystack`}
                          </span>
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
