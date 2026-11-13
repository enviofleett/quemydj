'use client';

import React, { useState } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { BoothQrPassSheetContent } from '@/components/qr/BoothQrPassSheetContent';
import {
  CheckCircle2,
  DollarSign,
  Music,
  Plus,
  QrCode,
  ArrowLeft,
  X,
  Sun,
  Moon
} from 'lucide-react';
import Link from 'next/link';

const POPULAR_GENRES = [
  'Afrobeats',
  'Amapiano',
  'Reggae',
  'Dancehall',
  'Hip-Hop',
  'R&B',
  'Deep House',
  'Afro House',
  'Latin / Reggaeton',
  'Pop',
  'Throwback 90s/00s',
  'Trap'
];

export default function DJSettingsMobilePage() {
  const { currentDj, updateDjProfile, themeMode, toggleThemeMode } = useCueApp();
  const session = currentDj.liveSession;

  const [name, setName] = useState(currentDj.name);
  const [handle, setHandle] = useState(currentDj.handle);
  const [bio, setBio] = useState(currentDj.bio || '');
  const [passcode, setPasscode] = useState(session?.passcode || 'SKY99');
  const [price, setPrice] = useState(session?.basePrice ? session.basePrice.toString() : '5000');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(currentDj.genres || []);
  const [customGenre, setCustomGenre] = useState('');
  const [saved, setSaved] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleAddCustomGenre = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customGenre.trim();
    if (clean && !selectedGenres.includes(clean)) {
      setSelectedGenres((prev) => [...prev, clean]);
      setCustomGenre('');
    }
  };

  const removeGenre = (genre: string) => {
    setSelectedGenres((prev) => prev.filter((g) => g !== genre));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price) || 15;
    updateDjProfile({
      name: name.trim() || currentDj.name,
      handle: handle.trim() || currentDj.handle,
      bio: bio.trim(),
      genres: selectedGenres,
      basePrice: parsedPrice,
      passcode: passcode.trim().toUpperCase() || 'SKY99',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-[#0c0d10] text-zinc-950 dark:text-zinc-100 transition-colors">
      {/* Sticky Native Header with Back Button */}
      <header className="px-5 h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-[#0c0d10]/90 backdrop-blur-xl z-20 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dj"
            aria-label="Back to booth console"
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center flex-shrink-0 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-zinc-950 dark:text-white tracking-tight truncate leading-tight">
              Booth Settings & QR
            </h1>
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
              {currentDj.name} · {currentDj.currentVenue.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleThemeMode}
            title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            {themeMode === 'light' ? (
              <Moon className="w-4 h-4 text-indigo-600" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <Link
            href="/"
            className="h-8 px-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-[12px] font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <span>Guest View</span>
          </Link>
        </div>
      </header>

      <main className="px-5 pt-4 pb-8 space-y-6">
        {/* 1. BOOTH QR CODE & PRINTABLE POSTER CARD */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-zinc-700" />
            <h2 className="text-[15px] font-semibold text-zinc-900">
              Booth QR Code & Table Poster
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Print Ready
          </span>
        </div>

        {/* Reusable QR Pass & 1080x1350 Poster Downloader */}
        <div className="rounded-2xl border border-black/[0.07] p-4 bg-zinc-50/50 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <BoothQrPassSheetContent dj={currentDj} />
        </div>
      </section>

      {/* 2. PROFILE & PRICING FORM */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Stage Profile Section */}
        <section className="rounded-2xl border border-black/[0.07] p-4 space-y-4 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3.5">
            <img
              src={currentDj.avatarUrl}
              alt={currentDj.name}
              className="w-14 h-14 rounded-2xl object-cover ring-1 ring-black/[0.06] flex-shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[16px] font-semibold text-zinc-900 block truncate">
                {name || currentDj.name}
              </span>
              <span className="text-[13px] text-zinc-500 block truncate">
                {handle || currentDj.handle} · {currentDj.currentVenue.name}
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-zinc-100">
            <div>
              <label className="text-[13px] font-medium text-zinc-700 block mb-1">
                Stage / DJ Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="DJ Kofi Beats"
                className="w-full h-11 px-3.5 bg-zinc-100 rounded-xl text-[14px] text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[13px] font-medium text-zinc-700 block mb-1">
                  Social Handle
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@kofibeats"
                  className="w-full h-11 px-3.5 bg-zinc-100 rounded-xl text-[14px] text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-zinc-700 block mb-1">
                  Table Passcode
                </label>
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  placeholder="SKY99"
                  className="w-full h-11 px-3.5 bg-zinc-100 rounded-xl text-[14px] font-mono uppercase text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium text-zinc-700 block mb-1">
                Booth Bio & Instructions for Guests
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Resident DJ spinning Afrobeats, Amapiano, Roots Reggae, and Hip-Hop."
                className="w-full p-3 bg-zinc-100 rounded-xl text-[13px] text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all resize-none"
              />
            </div>
          </div>
        </section>

        {/* 3. REQUEST RATE & PRICING PRESETS */}
        <section className="rounded-2xl border border-black/[0.07] p-4 space-y-3 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-emerald-600">₦</span>
              <label className="text-[14px] font-semibold text-zinc-900">
                Song Request Rate (NGN ₦)
              </label>
            </div>
            <span className="text-[12px] font-medium text-zinc-400">Per Track</span>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-zinc-400">
              ₦
            </span>
            <input
              type="number"
              min="500"
              step="500"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-12 pl-8 pr-3.5 bg-zinc-100 rounded-xl text-[18px] font-bold text-zinc-950 tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-[12px] text-zinc-500 font-medium">Quick rates:</span>
            {['2000', '3000', '5000', '10000', '20000'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPrice(preset)}
                className={`h-8 px-2.5 rounded-lg text-[12px] font-semibold transition-all ${
                  price === preset
                    ? 'bg-zinc-950 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80'
                }`}
              >
                ₦{Number(preset).toLocaleString()}
              </button>
            ))}
          </div>

          <p className="text-[12px] text-zinc-400 leading-relaxed pt-1">
            Guests pay this amount via Paystack or Bank Transfer when requesting songs. If you decline or don&apos;t play it before the set ends, they are 100% refunded automatically.
          </p>
        </section>

        {/* 4. ACCEPTED GENRES SECTION */}
        <section className="rounded-2xl border border-black/[0.07] p-4 space-y-3.5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-zinc-800" />
              <label className="text-[14px] font-semibold text-zinc-900">
                Accepted Music Genres
              </label>
            </div>
            <span className="text-[12px] font-medium text-zinc-500 tabular-nums">
              {selectedGenres.length} selected
            </span>
          </div>

          <p className="text-[12px] text-zinc-500 leading-relaxed">
            Choose what styles of music fit tonight&apos;s venue and vibe. Guests will see these tags on your booth card.
          </p>

          {/* Current Active Genre Tags */}
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {selectedGenres.length === 0 ? (
              <span className="text-[12px] text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-lg">
                No genres selected yet (guests won&apos;t see genre guidance)
              </span>
            ) : (
              selectedGenres.map((genre) => (
                <span
                  key={genre}
                  className="h-8 px-3 rounded-full bg-zinc-950 text-white text-[12px] font-medium inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>{genre}</span>
                  <button
                    type="button"
                    onClick={() => removeGenre(genre)}
                    className="w-4 h-4 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors -mr-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Popular Genre Quick Selectors */}
          <div className="pt-2 border-t border-zinc-100 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Tap to add / remove popular genres:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_GENRES.map((g) => {
                const isSelected = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`h-8 px-3 rounded-full text-[12px] font-medium transition-all ${
                      isSelected
                        ? 'bg-zinc-200 text-zinc-900 font-semibold'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
                    }`}
                  >
                    {isSelected ? `✓ ${g}` : `+ ${g}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Genre Adder */}
          <div className="pt-2 flex gap-2">
            <input
              type="text"
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              placeholder="Add custom genre (e.g. Amapiano / Afro-Tech)"
              className="flex-1 h-10 px-3 bg-zinc-100 rounded-xl text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <button
              type="button"
              onClick={handleAddCustomGenre}
              disabled={!customGenre.trim()}
              className="h-10 px-4 bg-zinc-950 text-white text-[13px] font-semibold rounded-xl disabled:opacity-40 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </section>

        {/* Save Feedback Banner */}
        {saved && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 rounded-xl text-[13px] font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Booth profile, rates, and accepted genres saved!</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full h-12 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-[15px] rounded-xl flex items-center justify-center transition-all active:scale-[0.99] shadow-sm"
        >
          Save All Changes
        </button>
      </form>
      </main>
    </div>
  );
}
