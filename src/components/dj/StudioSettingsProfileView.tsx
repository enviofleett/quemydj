'use client';

import React, { useState } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { BoothQrPassSheetContent } from '@/components/qr/BoothQrPassSheetContent';
import {
  Sliders,
  QrCode,
  DollarSign,
  Music,
  CheckCircle2,
  ShieldCheck,
  Radio
} from 'lucide-react';

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

export const StudioSettingsProfileView: React.FC = () => {
  const { currentDj, updateDjProfile, updateDjSessionStatus, updateDjSessionDetails } = useCueApp();
  const session = currentDj.liveSession;

  const [name, setName] = useState(currentDj.name);
  const [handle, setHandle] = useState(currentDj.handle);
  const [bio, setBio] = useState(currentDj.bio || '');
  const [passcode, setPasscode] = useState(session?.passcode || 'SKY99');
  const [price, setPrice] = useState(session?.basePrice ? session.basePrice.toString() : '5000');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(currentDj.genres || []);
  const [isAccepting, setIsAccepting] = useState(session?.isAcceptingRequests ?? true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = Math.max(1, parseFloat(price) || 15);
    updateDjProfile({
      name,
      handle,
      bio,
      genres: selectedGenres,
      basePrice: parsedPrice,
      passcode,
    });
    updateDjSessionStatus(isAccepting);
    updateDjSessionDetails({
      basePrice: parsedPrice,
      passcode,
    });

    setSavedNotice('Profile & live set parameters successfully updated!');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] shadow-xl overflow-hidden text-[var(--dj-text-primary)] transition-colors">
      {/* Header bar */}
      <div className="p-3.5 border-b border-[var(--dj-border)] flex items-center justify-between gap-3 bg-[var(--dj-bg-card)]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-500" />
          <span className="text-[14px] font-bold text-[var(--dj-text-primary)] tracking-tight">
            DJ Profile, Live Rates &amp; Booth QR Pass
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[12px] flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Save Changes
        </button>
      </div>

      {savedNotice && (
        <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-950/70 border-b border-emerald-300 dark:border-emerald-800/50 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Two-Column Editor: Left Settings / Right Booth QR Flyer */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Form: Profile & Live Session Controls (Cols 1-7) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
          
          {/* Live Request Master Toggle */}
          <div className="p-4 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] flex items-center justify-between gap-4">
            <div>
              <div className="text-[13px] font-bold text-[var(--dj-text-primary)] flex items-center gap-2">
                <Radio className={`w-3.5 h-3.5 ${isAccepting ? 'text-emerald-500 animate-pulse' : 'text-[var(--dj-text-muted)]'}`} />
                Accepting Live Guest Requests
              </div>
              <p className="text-[11px] text-[var(--dj-text-muted)] mt-0.5">
                When active, guests scanning your QR pass can pay and submit requests immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAccepting(!isAccepting)}
              className={`w-12 h-6 rounded-full p-1 transition-colors relative cursor-pointer ${
                isAccepting ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white dark:bg-black transition-transform ${
                  isAccepting ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Pricing & Booth Passcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--dj-text-secondary)] block">
                Base Request Fee (NGN ₦)
              </label>
              <div className="relative">
                <span className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2">
                  ₦
                </span>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] rounded-lg text-[13px] text-[var(--dj-text-primary)] font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-[10px] text-[var(--dj-text-faint)] block">
                Guests can add extra tips on top
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--dj-text-secondary)] block">
                Table Passcode (Optional)
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                placeholder="e.g. SKY99"
                className="w-full px-3 py-2 bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] rounded-lg text-[13px] text-[var(--dj-text-primary)] font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-[var(--dj-text-faint)] block">
                Limits requests to guests inside the venue
              </span>
            </div>
          </div>

          {/* DJ Name & Handle */}
          <div className="p-4 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--dj-text-secondary)] block">DJ Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] rounded-lg text-[13px] text-[var(--dj-text-primary)] focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--dj-text-secondary)] block">Handle</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] rounded-lg text-[13px] text-[var(--dj-text-primary)] font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--dj-text-secondary)] block">Bio / Welcome Announcement</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What vibes are you playing tonight?"
                className="w-full px-3 py-2 bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] rounded-lg text-[13px] text-[var(--dj-text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Accepted Genres */}
          <div className="p-4 rounded-xl bg-[var(--dj-bg-card-subtle)] border border-[var(--dj-border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[var(--dj-text-primary)] flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-500" />
                Accepted Genres for this Set
              </span>
              <span className="text-[11px] text-[var(--dj-text-muted)]">
                {selectedGenres.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {POPULAR_GENRES.map((genre) => {
                const isSelected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] hover:text-[var(--dj-text-primary)] border border-[var(--dj-border)]'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Right Preview: Live Booth QR Standee Pass (Cols 8-12) */}
        <div className="lg:col-span-5 bg-[var(--dj-bg-card-subtle)] rounded-xl border border-[var(--dj-border)] p-4 flex flex-col justify-between items-center text-center space-y-4">
          <div className="space-y-1">
            <div className="text-[13px] font-bold text-[var(--dj-text-primary)] flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-500" />
              Venue Booth QR Sign
            </div>
            <p className="text-[11px] text-[var(--dj-text-muted)] max-w-xs mx-auto">
              Place this sign on the DJ booth or table tent cards for guests to scan.
            </p>
          </div>

          {/* Scaled QR Sheet container */}
          <div className="w-full max-w-[320px] rounded-2xl bg-zinc-950 p-3 border border-zinc-800 shadow-2xl">
            <BoothQrPassSheetContent dj={currentDj} />
          </div>

          <div className="text-[11px] text-[var(--dj-text-muted)] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Direct payments processed via Paystack / Apple Pay</span>
          </div>
        </div>

      </div>
    </div>
  );
};
