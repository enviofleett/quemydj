'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useCueApp } from '@/context/CueAppContext';
import { Song, TrackAvailability } from '@/types';
import { createLocalSongFromFile } from '@/services/localAudioService';
import { djAudioEngine } from '@/services/djAudioEngine';
import {
  Upload,
  Search,
  Music,
  CheckCircle2,
  Play,
  Copy,
  Check,
} from 'lucide-react';

interface MusicLibraryPanelProps {
  onLoadTrack: (deck: 'A' | 'B', song: Song) => void;
  activeDeckATrackId?: string | null;
  activeDeckBTrackId?: string | null;
}

export const MusicLibraryPanel: React.FC<MusicLibraryPanelProps> = ({
  onLoadTrack,
  activeDeckATrackId,
}) => {
  const { djLibrary, addSongToDjLibrary } = useCueApp();
  const [activeTab, setActiveTab] = useState<'crate' | 'discover'>('crate');
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [onlineResults, setOnlineResults] = useState<Song[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const copyTrackQuery = (song: Song) => {
    navigator.clipboard.writeText(`${song.artist} - ${song.title}`);
    setCopiedId(song.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setImportStatus(`Analyzing ${files.length} file(s)...`);

    const ctx = djAudioEngine.getContext();
    if (!ctx) {
      setImportStatus('Audio context unavailable.');
      setIsImporting(false);
      return;
    }

    try {
      let importedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validExtensions = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !validExtensions.includes(ext)) continue;

        const song = await createLocalSongFromFile(file, ctx);
        addSongToDjLibrary(song);
        importedCount++;
      }
      setImportStatus(`Imported ${importedCount} track(s).`);
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      console.error('File import error:', err);
      setImportStatus('Could not decode one or more files.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
            bpm: 120 + ((t.title.length * 3) % 25),
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
    <div className="flex flex-col flex-1 min-h-[420px] bg-[var(--dj-bg-card)] rounded-xl border border-[var(--dj-border)] overflow-hidden transition-colors">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-[var(--dj-border)] flex items-center justify-between gap-2">
        <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--dj-bg-control)] border border-[var(--dj-border)] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('crate')}
            className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'crate'
                ? 'bg-[var(--dj-bg-card)] text-[var(--dj-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            Local Crate ({djLibrary.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'discover'
                ? 'bg-[var(--dj-bg-card)] text-[var(--dj-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)]'
            }`}
          >
            Catalog
          </button>
        </div>

        {/* Import Button */}
        <div className="shrink-0">
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
            className="h-8 px-3 rounded-lg bg-[var(--dj-bg-control)] hover:bg-[var(--dj-bg-control-hover)] text-[var(--dj-text-primary)] text-[12px] font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors border border-[var(--dj-border)] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[var(--dj-text-secondary)]" />
            <span>{isImporting ? 'Importing...' : 'Import'}</span>
          </button>
        </div>
      </div>

      {/* Import Toast */}
      {importStatus && (
        <div className="px-4 py-2 bg-[var(--dj-bg-card-subtle)] border-b border-[var(--dj-border)] text-[12px] text-[var(--dj-text-secondary)] flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3 border-b border-[var(--dj-border-subtle)] bg-[var(--dj-bg-card-subtle)]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--dj-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
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
                ? 'Filter local crate...'
                : 'Search tracks, artists, remixes...'
            }
            className="w-full h-9 pl-8 pr-3 bg-[var(--dj-input-bg)] border border-[var(--dj-input-border)] rounded-lg text-[13px] text-[var(--dj-text-primary)] placeholder:text-[var(--dj-text-muted)] focus:outline-none focus:border-[var(--dj-border-highlight)] transition-colors"
          />
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--dj-border-subtle)]">
        {activeTab === 'crate' ? (
          filteredCrate.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-[var(--dj-bg-control)] border border-[var(--dj-border)] flex items-center justify-center text-[var(--dj-text-muted)] mb-3">
                <Music className="w-4 h-4" />
              </div>
              <p className="text-[13px] font-medium text-[var(--dj-text-primary)]">
                {searchQuery ? 'No matching tracks' : 'Local crate is empty'}
              </p>
              <p className="text-[12px] text-[var(--dj-text-muted)] mt-1 max-w-[260px] leading-relaxed">
                Import MP3, WAV, or FLAC files to audition or play them through the Aux Bridge.
              </p>
            </div>
          ) : (
            filteredCrate.map((song) => {
              const isLoaded = activeDeckATrackId === song.id;

              return (
                <div
                  key={song.id}
                  className="px-4 py-2.5 hover:bg-[var(--dj-bg-card-subtle)] flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-9 h-9 rounded-md overflow-hidden shrink-0 bg-[var(--dj-bg-control)] border border-[var(--dj-border)]">
                      <Image
                        src={song.coverUrl}
                        alt={song.title}
                        width={36}
                        height={36}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-[var(--dj-text-primary)] truncate">
                        {song.title}
                      </div>
                      <div className="text-[11px] text-[var(--dj-text-muted)] truncate flex items-center gap-1.5">
                        <span className="truncate">{song.artist}</span>
                        {song.bpm && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{song.bpm} BPM</span>
                          </>
                        )}
                        {song.musicalKey && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{song.musicalKey}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => copyTrackQuery(song)}
                      aria-label="Copy title"
                      className="h-7 w-7 rounded-md bg-[var(--dj-bg-control)] hover:bg-[var(--dj-bg-control-hover)] text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      {copiedId === song.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLoadTrack('A', song)}
                      className={`h-7 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                        isLoaded
                          ? 'bg-[var(--dj-text-primary)] text-[var(--dj-bg-header)]'
                          : 'bg-[var(--dj-bg-control)] hover:bg-[var(--dj-bg-control-hover)] text-[var(--dj-text-primary)] border border-[var(--dj-border)]'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isLoaded ? 'Loaded' : 'Play'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Catalog Discovery Tab */
          <div>
            {isSearchingOnline ? (
              <div className="p-8 text-center text-[var(--dj-text-muted)] text-[12px]">
                Searching catalog...
              </div>
            ) : onlineResults.length === 0 ? (
              <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-[var(--dj-bg-control)] border border-[var(--dj-border)] flex items-center justify-center text-[var(--dj-text-muted)] mb-3">
                  <Search className="w-4 h-4" />
                </div>
                <p className="text-[13px] font-medium text-[var(--dj-text-primary)]">
                  Search global catalog
                </p>
                <p className="text-[12px] text-[var(--dj-text-muted)] mt-1 max-w-[260px] leading-relaxed">
                  Find songs to audition on the Aux Bridge or copy into your DJ software.
                </p>
              </div>
            ) : (
              onlineResults.map((song) => {
                const isLoaded = activeDeckATrackId === song.id;
                return (
                  <div
                    key={song.id}
                    className="px-4 py-2.5 hover:bg-[var(--dj-bg-card-subtle)] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-9 h-9 rounded-md overflow-hidden shrink-0 bg-[var(--dj-bg-control)] border border-[var(--dj-border)]">
                        <Image
                          src={song.coverUrl}
                          alt={song.title}
                          width={36}
                          height={36}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[var(--dj-text-primary)] truncate">
                          {song.title}
                        </div>
                        <div className="text-[11px] text-[var(--dj-text-muted)] truncate">
                          {song.artist} · {song.duration}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyTrackQuery(song)}
                        aria-label="Copy title"
                        className="h-7 w-7 rounded-md bg-[var(--dj-bg-control)] hover:bg-[var(--dj-bg-control-hover)] text-[var(--dj-text-muted)] hover:text-[var(--dj-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        {copiedId === song.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {song.availability === 'authorized_provider' ? (
                        <button
                          type="button"
                          onClick={() => onLoadTrack('A', song)}
                          className={`h-7 px-2.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                            isLoaded
                              ? 'bg-[var(--dj-text-primary)] text-[var(--dj-bg-header)]'
                              : 'bg-[var(--dj-bg-control)] hover:bg-[var(--dj-bg-control-hover)] text-[var(--dj-text-primary)] border border-[var(--dj-border)]'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isLoaded ? 'Loaded' : 'Play'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[var(--dj-text-faint)] px-2">
                          No preview
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
