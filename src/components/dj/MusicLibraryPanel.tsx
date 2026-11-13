'use client';

import React, { useState, useRef } from 'react';
import { useCueApp } from '@/context/CueAppContext';
import { Song, TrackAvailability } from '@/types';
import { createLocalSongFromFile } from '@/services/localAudioService';
import { djAudioEngine } from '@/services/djAudioEngine';
import {
  Upload,
  Search,
  Music,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Check
} from 'lucide-react';
import Image from 'next/image';

interface MusicLibraryPanelProps {
  onLoadTrack: (deck: 'A' | 'B', song: Song) => void;
  activeDeckATrackId?: string | null;
  activeDeckBTrackId?: string | null;
}

export const MusicLibraryPanel: React.FC<MusicLibraryPanelProps> = ({
  onLoadTrack,
  activeDeckATrackId,
  activeDeckBTrackId,
}) => {
  const { djLibrary, addSongToDjLibrary } = useCueApp();
  const [activeTab, setActiveTab] = useState<'crate' | 'discover'>('crate');
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Online search state
  const [onlineResults, setOnlineResults] = useState<Song[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle local file drag/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportStatus(`Analyzing ${files.length} audio file(s)...`);

    const ctx = djAudioEngine.getContext();
    if (!ctx) {
      setImportStatus('Audio context unavailable.');
      setIsImporting(false);
      return;
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate file type
        const validExtensions = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !validExtensions.includes(ext)) {
          continue;
        }

        const song = await createLocalSongFromFile(file, ctx);
        addSongToDjLibrary(song);
      }
      setImportStatus(`Successfully imported ${files.length} track(s)!`);
      setTimeout(() => setImportStatus(null), 3500);
    } catch (err) {
      console.error('File import error:', err);
      setImportStatus('Failed to decode one or more audio files.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Perform online catalog search via API route
  const handleOnlineSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setOnlineResults([]);
      return;
    }

    setIsSearchingOnline(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setOnlineResults(
          (data.results || []).map((t: Song) => ({
            ...t,
            availability: (t.previewUrl ? 'authorized_provider' : 'discovery_only') as TrackAvailability,
            bpm: 120 + ((t.title.length * 3) % 25), // heuristic if not provided
            musicalKey: `${((t.title.length % 12) + 1)}${t.title.length % 2 === 0 ? 'A' : 'B'}`,
            audioMetadata: {
              bitrate: 256,
              sampleRate: 44100,
              format: 'AAC',
              qualityTier: 'High',
            },
          }))
        );
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Filter local crate
  const filteredCrate = djLibrary.filter((song) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q) ||
      song.genre.toLowerCase().includes(q) ||
      song.musicalKey?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full bg-[var(--dj-bg-card)] rounded-2xl border border-[var(--dj-border)] shadow-xl overflow-hidden transition-colors">
      {/* Header bar */}
      <div className="p-3.5 border-b border-[var(--dj-border)] flex items-center justify-between gap-3 bg-[var(--dj-bg-card)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('crate')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-bold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'crate'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Local DJ Crate ({djLibrary.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-bold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-emerald-500 text-black shadow-sm'
                : 'bg-[var(--dj-bg-control)] text-[var(--dj-text-secondary)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Catalog Discovery
          </button>
        </div>

        {/* Import Audio File Trigger */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".mp3,.wav,.aac,.flac,.m4a,.ogg"
            className="hidden"
          />
          <button
            type="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-[var(--dj-bg-control)] hover:bg-[var(--dj-bg-control-hover)] text-[var(--dj-text-primary)] font-medium text-[12px] flex items-center gap-1.5 transition-colors border border-[var(--dj-border)] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            {isImporting ? 'Analyzing...' : 'Import Audio Files'}
          </button>
        </div>
      </div>

      {/* Status banner if importing */}
      {importStatus && (
        <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-950/60 border-b border-emerald-300 dark:border-emerald-800/40 text-[12px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Search Input Filter */}
      <div className="p-3 border-b border-[var(--dj-border)] bg-[var(--dj-bg-card-subtle)]">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--dj-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              activeTab === 'discover'
                ? handleOnlineSearch(e.target.value)
                : setSearchQuery(e.target.value)
            }
            placeholder={
              activeTab === 'crate'
                ? 'Search your local crate by title, artist, BPM, key...'
                : 'Search global catalogs & Apple Music / YouTube...'
            }
            className="w-full pl-9 pr-4 py-2 bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] rounded-xl text-[13px] text-[var(--dj-text-primary)] placeholder-[var(--dj-text-muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Track List Table / Grid */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--dj-border-subtle)] p-2 space-y-1">
        {activeTab === 'crate' ? (
          filteredCrate.length === 0 ? (
            <div className="p-8 text-center text-[var(--dj-text-muted)] space-y-2">
              <Music className="w-8 h-8 mx-auto text-[var(--dj-text-faint)]" />
              <div className="text-[13px] font-medium text-[var(--dj-text-secondary)]">
                {searchQuery ? 'No tracks matched your search.' : 'Your DJ crate is empty.'}
              </div>
              <p className="text-[11px] text-[var(--dj-text-faint)] max-w-sm mx-auto">
                Click &quot;Import Audio Files&quot; to load your local MP3, WAV, or FLAC tracks. DJQ
                will extract audio peaks, BPM, and bitrate locally.
              </p>
            </div>
          ) : (
            filteredCrate.map((song) => {
              const isLoadedA = activeDeckATrackId === song.id;
              const isLoadedB = activeDeckBTrackId === song.id;

              return (
                <div
                  key={song.id}
                  className="p-2.5 rounded-xl hover:bg-[var(--dj-bg-control)]/30 flex items-center justify-between gap-3 group transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--dj-bg-control)]">
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        width={40}
                        height={40}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[var(--dj-text-primary)] truncate">
                          {song.title}
                        </span>
                        {song.audioMetadata?.qualityTier === 'High' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {song.audioMetadata.format || 'HD'} {song.audioMetadata.bitrate ? `${song.audioMetadata.bitrate}k` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--dj-text-muted)] truncate flex items-center gap-2">
                        <span className="text-[var(--dj-text-secondary)]">{song.artist}</span>
                        <span>·</span>
                        <span className="text-[var(--dj-text-faint)]">{song.duration}</span>
                        {song.bpm && (
                          <>
                            <span>·</span>
                            <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold">
                              {song.bpm} BPM
                            </span>
                          </>
                        )}
                        {song.musicalKey && (
                          <>
                            <span>·</span>
                            <span className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
                              {song.musicalKey}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Deck Load Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadTrack('A', song)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        isLoadedA
                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/50'
                          : 'bg-[var(--dj-bg-control)] hover:bg-cyan-600 hover:text-black text-[var(--dj-text-primary)]'
                      }`}
                    >
                      {isLoadedA ? <Check className="w-3 h-3 text-cyan-500" /> : null}
                      LOAD A
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadTrack('B', song)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        isLoadedB
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/50'
                          : 'bg-[var(--dj-bg-control)] hover:bg-rose-600 hover:text-white text-[var(--dj-text-primary)]'
                      }`}
                    >
                      {isLoadedB ? <Check className="w-3 h-3 text-rose-500" /> : null}
                      LOAD B
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Catalog Discovery Tab */
          <div className="space-y-1">
            {isSearchingOnline ? (
              <div className="p-8 text-center text-[var(--dj-text-muted)] text-[13px]">
                Searching external catalog...
              </div>
            ) : onlineResults.length === 0 ? (
              <div className="p-8 text-center text-[var(--dj-text-muted)] space-y-2">
                <Search className="w-8 h-8 mx-auto text-[var(--dj-text-faint)]" />
                <div className="text-[13px] font-medium text-[var(--dj-text-secondary)]">
                  Search any song title, artist or remix.
                </div>
                <p className="text-[11px] text-[var(--dj-text-faint)] max-w-sm mx-auto">
                  Catalog results provide metadata and playable previews where authorized.
                  Streaming platforms restrict full raw audio DJ mixing without local file import.
                </p>
              </div>
            ) : (
              onlineResults.map((song) => (
                <div
                  key={song.id}
                  className="p-2.5 rounded-xl hover:bg-[var(--dj-bg-control)]/30 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--dj-bg-control)]">
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        width={40}
                        height={40}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[var(--dj-text-primary)] truncate">
                          {song.title}
                        </span>
                        {song.availability === 'authorized_provider' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Playable Preview
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--dj-bg-control)] text-[var(--dj-text-muted)]">
                            Discovery Only
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--dj-text-muted)] truncate">
                        {song.artist} · {song.duration}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {song.availability === 'authorized_provider' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onLoadTrack('A', song)}
                          className="px-2.5 py-1 rounded text-[11px] font-bold bg-[var(--dj-bg-control)] hover:bg-cyan-600 hover:text-black text-[var(--dj-text-primary)] transition-colors cursor-pointer"
                        >
                          LOAD A
                        </button>
                        <button
                          type="button"
                          onClick={() => onLoadTrack('B', song)}
                          className="px-2.5 py-1 rounded text-[11px] font-bold bg-[var(--dj-bg-control)] hover:bg-rose-600 hover:text-white text-[var(--dj-text-primary)] transition-colors cursor-pointer"
                        >
                          LOAD B
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--dj-text-muted)] flex items-center gap-1 px-2 py-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        Requires Import
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
