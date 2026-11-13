'use client';

import React, { useState } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { MapPin, Star, QrCode } from 'lucide-react';
import Link from 'next/link';

export default function EventsAroundPage() {
  const { djs } = useCueApp();
  const [selectedCity, setSelectedCity] = useState('All');

  const filteredDjs = djs.filter((dj) => {
    if (selectedCity === 'All') return true;
    return dj.currentVenue.city.toLowerCase().includes(selectedCity.toLowerCase());
  });

  return (
    <div className="flex flex-col flex-1 px-5 pt-5 pb-6 space-y-5 bg-white">
      {/* Screen Header */}
      <div>
        <h1 className="text-[22px] font-bold text-zinc-950 tracking-tight leading-tight">
          Discover DJs
        </h1>
        <p className="text-[13px] text-zinc-500 mt-0.5">
          Live booths and residencies performing nearby tonight
        </p>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['All', 'Brooklyn', 'Lower East Side', 'Meatpacking'].map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => setSelectedCity(city)}
            className={`h-8 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
              selectedCity === city
                ? 'bg-zinc-950 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {/* DJ Cards List */}
      <div className="space-y-3.5">
        {filteredDjs.map((dj) => {
          const session = dj.liveSession;
          const isLive = session?.isAcceptingRequests ?? false;

          return (
            <article
              key={dj.id}
              className="rounded-2xl border border-black/[0.07] p-4 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3"
            >
              {/* 3-Column Native Row */}
              <div className="flex items-start gap-3.5">
                <img
                  src={dj.avatarUrl}
                  alt={dj.name}
                  className="w-13 h-13 rounded-2xl object-cover ring-1 ring-black/[0.06] flex-shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[15px] font-semibold text-zinc-900 truncate leading-snug">
                      {dj.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-zinc-800 tabular-nums flex-shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {dj.rating}
                    </span>
                  </div>

                  <p className="text-[13px] text-zinc-500 truncate mt-0.5">
                    {dj.handle} · {dj.currentVenue.name}
                  </p>

                  <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mt-1 tabular-nums">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                    <span>{dj.currentVenue.distance}</span>
                    <span>·</span>
                    <span className="text-zinc-700 font-medium">
                      ₦{session ? session.basePrice.toLocaleString() : '5,000'} / track
                    </span>
                  </div>
                </div>
              </div>

              {/* Concise Bio */}
              <p className="text-[13px] text-zinc-600 line-clamp-2 leading-relaxed">
                {dj.bio}
              </p>

              {/* Genre Pills */}
              <div className="flex flex-wrap gap-1.5">
                {dj.genres.map((g) => (
                  <span
                    key={g}
                    className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600"
                  >
                    {g}
                  </span>
                ))}
              </div>

              {/* Hairline Footer */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                <div className="text-[12px]">
                  {isLive ? (
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Booth open</span>
                    </span>
                  ) : (
                    <span className="text-zinc-400 font-medium">Queue paused</span>
                  )}
                </div>

                <Link
                  href="/"
                  className="h-8 px-3.5 rounded-full bg-zinc-950 text-white text-[12px] font-semibold hover:bg-zinc-800 transition-all inline-flex items-center gap-1.5 active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
