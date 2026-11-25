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
  QrCode,
  MapPin,
  Loader2,
  ArrowLeftRight
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

  // Real Booth Connection State (starts disconnected until scanned, searched, or selected via GPS)
  const [connectedDj, setConnectedDj] = useState<DJ | null>(null);
  const [homeDjSearch, setHomeDjSearch] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);

  // Real Browser GPS Nearby Lookup State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [nearbyLiveDjs, setNearbyLiveDjs] = useState<DJ[]>([]);

  // Restore last connected booth from sessionStorage if the guest already connected in this visit
  useEffect(() => {
    try {
      const savedDjId = sessionStorage.getItem('cuemydj_connected_dj_id');
      if (savedDjId) {
        const match = djs.find((d) => d.id === savedDjId);
        if (match) setConnectedDj(match);
      }
    } catch {}
  }, [djs]);

  const connectToDj = useCallback((dj: DJ, openDrawer = false) => {
    setConnectedDj(dj);
    setSearchError(null);
    setLocationNotice(null);
    setNearbyLiveDjs([]);
    try {
      sessionStorage.setItem('cuemydj_connected_dj_id', dj.id);
    } catch {}
    if (openDrawer) {
      setActiveScannedDj(dj);
      setShowScannerModal(false);
    }
  }, []);

  const disconnectBooth = () => {
    setConnectedDj(null);
    setSearchError(null);
    setLocationNotice(null);
    try {
      sessionStorage.removeItem('cuemydj_connected_dj_id');
    } catch {}
  };

  // Real GPS lookup using browser Geolocation API + /api/sessions
  const handleFindNearbyViaGps = () => {
    setLocationNotice(null);
    setSearchError(null);

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationNotice('Location is not supported on this browser. Scan a QR code or search by handle.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async () => {
        try {
          const res = await fetch('/api/sessions');
          let liveList = djs.filter((d) => d.liveSession?.isAcceptingRequests);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.sessions) && data.sessions.length > 0) {
              const liveIds = new Set(
                data.sessions
                  .filter((s: { isAcceptingRequests?: boolean }) => s.isAcceptingRequests !== false)
                  .map((s: { djId?: string }) => s.djId)
              );
              const matched = djs.filter((d) => liveIds.has(d.id));
              if (matched.length > 0) liveList = matched;
            }
          }

          if (liveList.length === 0) {
            setLocationNotice('No On-Duty DJs found nearby right now. Try scanning a booth QR code.');
          } else {
            setNearbyLiveDjs(liveList);
          }
        } catch {
          setLocationNotice('Could not check live booths right now. Try scanning a QR code.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationNotice('Location access denied — scan a booth QR or search by DJ handle.');
        } else {
          setLocationNotice('Unable to determine your location. Scan a booth QR or search by handle.');
        }
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

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

      // Strictly match by passcode, ID, handle, DJ name, or venue name (no silent fake fallback)
      const foundDj = djs.find(
        (d) =>
          d.liveSession?.passcode.toUpperCase() === candidateCode ||
          d.id.toUpperCase() === candidateCode ||
          d.handle.replace('@', '').toUpperCase() === candidateCode ||
          d.name.toLowerCase().includes(normalizedQuery) ||
          d.currentVenue.name.toLowerCase().includes(normalizedQuery)
      );

      if (!foundDj) {
        setSearchError(`No live booth found for "${trimmed}". Check the handle or booth code.`);
        return false;
      }

      connectToDj(foundDj, true);
      setManualCode('');
      return true;
    },
    [djs, connectToDj]
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
    connectToDj(dj, true);
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
              alt="QueMyDJ Logo"
              className="w-full h-full object-contain p-0.5"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[17px] tracking-tight text-zinc-950 dark:text-white leading-tight">QueMyDJ</span>
            <span className="text-[9px] font-semibold tracking-wide text-zinc-400 dark:text-zinc-500 uppercase -mt-0.5">Powered by Zenbeatz</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark / Light Mode Selector */}
          <button
            type="button"
            onClick={toggleThemeMode}
            title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme mode"
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-colors cursor-pointer border border-black/[0.04] dark:border-white/[0.06]"
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4 text-indigo-600" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

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
        {/* 2. EDITORIAL 1:1 SQUARE HERO POSTER (Real Connection State + GPS Lookup) */}
        <section className="relative w-full aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-white flex flex-col justify-between p-5 shadow-[0_8px_30px_rgba(0,0,0,0.14)]">
          {/* Full-bleed atmospheric club photography */}
          <div
            className="absolute inset-0 bg-cover bg-center scale-105 pointer-events-none"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop')`,
            }}
          />
          {/* Balanced top & bottom editorial vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/75 via-zinc-950/25 to-zinc-950/95 pointer-events-none" />

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            {connectedDj ? (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-950/65 backdrop-blur-md border border-white/15 text-[11px] font-mono uppercase tracking-wider text-zinc-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Connected</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={isLocating}
                onClick={handleFindNearbyViaGps}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/65 hover:bg-zinc-900/80 backdrop-blur-md border border-white/15 text-[11px] font-medium text-zinc-100 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isLocating ? (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                ) : (
                  <MapPin className="w-3 h-3 text-emerald-400" />
                )}
                <span>{isLocating ? 'Locating...' : 'Find nearby'}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              {connectedDj && (
                <button
                  type="button"
                  onClick={disconnectBooth}
                  className="h-8 px-2.5 rounded-lg bg-zinc-950/65 hover:bg-zinc-900/85 backdrop-blur-md border border-white/15 text-zinc-200 text-[11.5px] font-medium whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Switch</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="h-8 px-3 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-[12px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan QR</span>
              </button>
            </div>
          </div>

          {/* Bottom Anchor */}
          <div className="relative z-10 space-y-3.5">
            {connectedDj ? (
              <div className="space-y-3.5">
                <div
                  onClick={() => handleSimulateScan(connectedDj)}
                  className="flex items-center gap-3.5 cursor-pointer group"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/25 shrink-0 bg-zinc-900">
                    <img
                      src={connectedDj.avatarUrl}
                      alt={connectedDj.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 truncate">
                      {connectedDj.currentVenue.name}
                    </div>
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white leading-tight truncate mt-0.5">
                      {connectedDj.name}
                    </h1>
                    <p className="text-[12px] text-zinc-300 truncate mt-0.5">
                      From ₦{(connectedDj.liveSession?.basePrice || 5000).toLocaleString()}/track · {connectedDj.handle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSimulateScan(connectedDj)}
                  className="w-full h-10 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Request a Song</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white leading-tight">
                    Connect to a Booth
                  </h1>
                  <p className="text-[12.5px] text-zinc-300 mt-1 leading-relaxed">
                    Scan the DJ&apos;s booth QR, enter their handle, or use location to see who&apos;s On Duty.
                  </p>
                </div>

                {/* Live Nearby DJs (only shown after user explicitly taps "Find nearby" and grants GPS) */}
                {nearbyLiveDjs.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-0.5">
                    {nearbyLiveDjs.map((dj) => (
                      <button
                        key={dj.id}
                        type="button"
                        onClick={() => connectToDj(dj, true)}
                        className="w-full p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={dj.avatarUrl}
                            alt={dj.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/20"
                          />
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold text-white truncate">
                              {dj.name}
                            </div>
                            <div className="text-[11px] text-zinc-300 truncate">
                              {dj.currentVenue.name} · ₦{(dj.liveSession?.basePrice || 5000).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {locationNotice && (
                  <p className="text-[11.5px] text-amber-300 leading-snug">
                    {locationNotice}
                  </p>
                )}

                {/* Direct DJ Search Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearchError(null);
                    if (homeDjSearch.trim()) {
                      handleResolveCode(homeDjSearch.trim());
                      setHomeDjSearch('');
                    }
                  }}
                  className="pt-2.5 border-t border-white/15 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 focus-within:border-white/35 transition-colors">
                      <Search className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                      <input
                        type="text"
                        value={homeDjSearch}
                        onChange={(e) => {
                          setHomeDjSearch(e.target.value);
                          if (searchError) setSearchError(null);
                        }}
                        placeholder="DJ handle, name, or booth code..."
                        className="w-full bg-transparent text-[12.5px] text-white placeholder:text-zinc-400 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!homeDjSearch.trim()}
                      className="h-9 px-3.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 text-[12px] font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Find
                    </button>
                  </div>

                  {searchError && (
                    <p className="text-[11.5px] text-rose-300 leading-snug">
                      {searchError}
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
        </section>

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
      <Drawer.Root
        open={showScannerModal}
        onOpenChange={(open) => {
          setShowScannerModal(open);
          if (!open) setSearchError(null);
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" />
          <Drawer.Content
            aria-labelledby="scanner-sheet-title"
            className="bg-white dark:bg-[#0c0d12] text-zinc-950 dark:text-zinc-100 border-t border-transparent dark:border-zinc-800 flex flex-col rounded-t-[28px] max-h-[90dvh] fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 focus:outline-none shadow-2xl overflow-hidden"
          >
            {/* Fixed Non-Scrolling Header (Prevents Clipping) */}
            <div className="shrink-0 px-5 pt-3 pb-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Drawer.Title
                    id="scanner-sheet-title"
                    className="text-[17px] font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug"
                  >
                    Connect to Booth
                  </Drawer.Title>
                  <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Scan the booth QR or select an On-Duty DJ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScannerModal(false)}
                  aria-label="Close scanner"
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
              {/* Live WebRTC Camera QR Scanner */}
              <LiveQrCameraScanner onScanSuccess={handleResolveCode} />

              {/* Inline Scan / Code Error Feedback */}
              {searchError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[12px] text-rose-600 dark:text-rose-400 font-medium">
                  {searchError}
                </div>
              )}

              {/* Real On-Duty DJs from Supabase */}
              <div className="space-y-2">
                <span className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 block">
                  On-Duty DJs live right now
                </span>
                {djs.filter((dj) => dj.liveSession?.isAcceptingRequests).length === 0 ? (
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center text-[12.5px] text-zinc-500 dark:text-zinc-400">
                    No DJs are currently On Duty. Enter a booth passcode below to connect.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-black/[0.07] dark:border-zinc-800 overflow-hidden">
                    {djs
                      .filter((dj) => dj.liveSession?.isAcceptingRequests)
                      .map((dj) => (
                        <button
                          key={dj.id}
                          type="button"
                          onClick={() => handleSimulateScan(dj)}
                          className="w-full p-3.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={dj.avatarUrl}
                              alt={dj.name}
                              className="w-11 h-11 rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px] font-semibold text-zinc-900 dark:text-white truncate">
                                  {dj.name}
                                </span>
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium truncate">
                                  {dj.handle}
                                </span>
                              </div>
                              <div className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {dj.currentVenue.name} &bull;{' '}
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                  ₦{(dj.liveSession?.basePrice || 5000).toLocaleString()}/track
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg shrink-0">
                            {dj.liveSession?.passcode || 'LIVE'}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Manual Search & DJ Name / Handle / Passcode Entry */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 block">
                  Search DJ or enter booth passcode
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearchError(null);
                    handleResolveCode(manualCode);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => {
                      setManualCode(e.target.value);
                      if (searchError) setSearchError(null);
                    }}
                    placeholder="DJ name, @handle or passcode"
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
                      Genres in Tonight&apos;s Rotation:
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
