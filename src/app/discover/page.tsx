'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCueApp } from '@/context/CueAppContext';
import {
  Search,
  MapPin,
  QrCode,
  Flame,
  Radio,
  SlidersHorizontal,
  ArrowRight,
  Disc3,
  Sparkles,
  ChevronRight,
  Music2,
  DollarSign,
  Compass
} from 'lucide-react';

export default function DiscoverPage() {
  const { djs, userLocation, setUserLocation } = useCueApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [showLocationModal, setShowLocationModal] = useState(false);

  const allGenres = ['All', 'Afrobeats', 'Amapiano', 'House', 'Hip-Hop', 'R&B', 'Reggaeton'];

  // Filter DJs
  const filteredDjs = djs.filter((dj) => {
    const matchesSearch =
      dj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dj.currentVenue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dj.currentVenue.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dj.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGenre =
      selectedGenre === 'All' ||
      dj.genres.some((g) => g.toLowerCase().includes(selectedGenre.toLowerCase()));

    return matchesSearch && matchesGenre;
  });

  const liveDjs = filteredDjs.filter((dj) => dj.liveSession !== undefined);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-12 space-y-8">
      {/* Top Bar: Location Selector & Brand Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live Nightlife</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
            Discover Live DJs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Request tracks, tip the booth, and follow your song in the live queue.
          </p>
        </div>

        {/* Location badge selector */}
        <button
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#131b26] hover:bg-[#1b2636] border border-[#233044] text-xs font-semibold text-slate-200 transition-all self-start sm:self-auto shadow-sm"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>{userLocation.city}</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
            {userLocation.hasPermission ? 'GPS active' : 'Custom'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 ml-1" />
        </button>
      </div>

      {/* Quick Action: Scan Event QR Card Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/70 via-[#102422] to-[#131b26] border border-emerald-500/30 p-5 sm:p-6 shadow-xl">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-900/50 border border-emerald-700/50 px-2.5 py-1 rounded-full">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>At a venue right now?</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Scan DJ booth or table QR code
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Jump straight to the DJ’s live session and bypass browsing. Enter event passcode or use your camera.
            </p>
          </div>

          <Link
            href="/qr-scanner"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto"
          >
            <QrCode className="w-4 h-4 text-black" />
            <span>Scan Event QR</span>
          </Link>
        </div>
      </div>

      {/* Search Bar & Genre Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DJ name, venue (e.g. Skyline Rooftop), or genre..."
            className="w-full pl-11 pr-4 py-3 bg-[#111722] hover:bg-[#141b29] focus:bg-[#141b29] border border-[#233044] focus:border-emerald-500/60 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-[#1a2433] px-2 py-0.5 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Genre Pill Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {allGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedGenre === genre
                  ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/20'
                  : 'bg-[#131b26] text-slate-300 hover:text-white border border-[#233044] hover:bg-[#1b2636]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Live DJs Near You */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Live DJs Near You
              <span className="text-xs font-normal text-slate-400">({liveDjs.length} active)</span>
            </h2>
          </div>
          <span className="text-xs text-slate-400">Updated in real-time</span>
        </div>

        {liveDjs.length === 0 ? (
          <div className="bg-[#101622] border border-[#233044] rounded-2xl p-8 text-center space-y-3">
            <Radio className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-semibold text-white">No active live DJs matching filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try choosing another genre or clearing your search. You can also change your city location.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('All');
              }}
              className="text-xs text-emerald-400 hover:underline font-medium"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveDjs.map((dj) => {
              const session = dj.liveSession!;
              const isAccepting = session.isAcceptingRequests;

              return (
                <div
                  key={dj.id}
                  className="group bg-[#111722] hover:bg-[#151d2b] border border-[#233044] hover:border-slate-600 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col justify-between shadow-lg"
                >
                  <div>
                    {/* DJ Banner Header */}
                    <div className="relative h-32 w-full overflow-hidden bg-slate-800">
                      <img
                        src={dj.bannerUrl}
                        alt={dj.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111722] via-[#111722]/50 to-transparent" />

                      {/* Live Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-bold text-white">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>LIVE NOW</span>
                      </div>

                      {/* Distance */}
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>{dj.currentVenue.distance}</span>
                      </div>

                      {/* Avatar */}
                      <div className="absolute -bottom-4 left-4 w-14 h-14 rounded-full border-2 border-[#111722] overflow-hidden bg-slate-900 shadow-md">
                        <img
                          src={dj.avatarUrl}
                          alt={dj.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="pt-6 px-4 pb-3 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {dj.name}
                          </h3>
                          <span className="text-xs font-semibold text-amber-400 flex items-center gap-0.5">
                            ★ {dj.rating}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <span className="text-slate-300 font-medium">{dj.currentVenue.name}</span>
                          <span>•</span>
                          <span>{dj.currentVenue.city}</span>
                        </p>
                      </div>

                      {/* Session Name & Announcement */}
                      <div className="bg-[#161f2e] border border-[#233044] rounded-xl p-2.5 text-xs space-y-1">
                        <div className="font-semibold text-slate-200 truncate">
                          {session.title}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Set: {session.startTime} – {session.endTime}</span>
                          <span className="text-emerald-400 font-semibold">
                            ₦{session.basePrice.toLocaleString()} min request
                          </span>
                        </div>
                      </div>

                      {/* Genre Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        {dj.genres.map((g) => (
                          <span
                            key={g}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#192333] text-slate-300 border border-[#26354c]"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="p-4 pt-1 border-t border-[#1b2536] flex items-center justify-between gap-3">
                    <div className="text-[11px]">
                      {isAccepting ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Requests Open
                        </span>
                      ) : (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Queue Paused
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/djs/${dj.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <span>View Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: All Verified Roster DJs */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Resident & Touring Roster
          </h2>
          <span className="text-xs text-slate-400">NYC Nightlife Network</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {djs.map((dj) => (
            <Link
              key={dj.id}
              href={`/djs/${dj.id}`}
              className="bg-[#101622] hover:bg-[#141b29] border border-[#233044] hover:border-slate-600 rounded-xl p-4 flex items-center gap-3 transition-all group"
            >
              <img
                src={dj.avatarUrl}
                alt={dj.name}
                className="w-12 h-12 rounded-full object-cover border border-[#2c3b52] flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                  {dj.name}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {dj.currentVenue.name}
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">
                  {dj.liveSession?.isAcceptingRequests ? '● Requests Open' : '○ Offline / Breaks'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Location Modal Fallback */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-[#233044] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Select Event Area
              </h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-slate-400 hover:text-white text-xs bg-[#1a2433] px-2 py-1 rounded"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Choose your current city district to find nearby DJs and club sessions without GPS location permission.
            </p>

            <div className="space-y-2">
              {[
                'Downtown Brooklyn, NY',
                'Lower East Side, NY',
                'Williamsburg, Brooklyn, NY',
                'Meatpacking District, NY',
                'Harlem & Upper Manhattan, NY',
              ].map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    setUserLocation({ city, hasPermission: false });
                    setShowLocationModal(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-between ${
                    userLocation.city === city
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                      : 'bg-[#151d2a] border-[#233044] text-slate-300 hover:text-white hover:bg-[#1a2536]'
                  }`}
                >
                  <span>{city}</span>
                  {userLocation.city === city && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
