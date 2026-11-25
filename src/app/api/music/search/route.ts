import { NextRequest, NextResponse } from 'next/server';
import { Song } from '@/types';
import { MOCK_SONGS } from '@/data/mockData';

interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  trackViewUrl?: string;
  releaseDate?: string;
}

interface AudiusTrackItem {
  id: string | number;
  title: string;
  user?: {
    name?: string;
  };
  duration?: number;
  bpm?: number;
  musical_key?: string;
  genre?: string;
  release_date?: string;
  artwork?: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  };
  stream?: {
    url?: string;
  };
  is_streamable?: boolean;
}

type ProviderName = 'audius' | 'itunes' | 'youtube';
type SearchType = 'all' | 'official' | 'streaming' | 'audius' | 'itunes' | 'youtube';

interface CacheEntry {
  results: Song[];
  providers: ProviderName[];
  createdAt: number;
  expiresAt: number;
  staleUntil: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 500;
const PROVIDER_TIMEOUT_MS = 4000;

declare global {
  var __quemydjSearchCache: Map<string, CacheEntry> | undefined;
  var __quemydjProviderCooldowns: Record<ProviderName, number> | undefined;
  var __quemydjInFlightSearch: Map<string, Promise<{ results: Song[]; providers: ProviderName[]; degraded: boolean }>> | undefined;
}

function getCache(): Map<string, CacheEntry> {
  if (!globalThis.__quemydjSearchCache) {
    globalThis.__quemydjSearchCache = new Map();
  }
  return globalThis.__quemydjSearchCache;
}

function getCooldowns(): Record<ProviderName, number> {
  if (!globalThis.__quemydjProviderCooldowns) {
    globalThis.__quemydjProviderCooldowns = { audius: 0, itunes: 0, youtube: 0 };
  }
  return globalThis.__quemydjProviderCooldowns;
}

function getInFlight(): Map<string, Promise<{ results: Song[]; providers: ProviderName[]; degraded: boolean }>> {
  if (!globalThis.__quemydjInFlightSearch) {
    globalThis.__quemydjInFlightSearch = new Map();
  }
  return globalThis.__quemydjInFlightSearch;
}

function isProviderCoolingDown(provider: ProviderName): boolean {
  return Date.now() < (getCooldowns()[provider] || 0);
}

function setProviderCooldown(provider: ProviderName, retryAfterHeader?: string | null): void {
  const retrySec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 30;
  const durationMs = Number.isFinite(retrySec) && retrySec > 0 ? Math.min(retrySec, 120) * 1000 : 30000;
  getCooldowns()[provider] = Date.now() + durationMs;
}

function setCacheEntry(key: string, results: Song[], providers: ProviderName[]): void {
  const cache = getCache();
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  const now = Date.now();
  cache.set(key, {
    results,
    providers,
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
    staleUntil: now + STALE_TTL_MS,
  });
}

function formatDuration(seconds: number): string {
  const safe = Math.max(1, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

async function searchAudius(query: string, limit: number): Promise<{ tracks: Song[]; ok: boolean }> {
  if (isProviderCoolingDown('audius')) {
    return { tracks: [], ok: false };
  }
  try {
    const audiusUrl = `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(
      query
    )}&app_name=cuemydj`;

    const res = await fetch(audiusUrl, {
      headers: {
        'User-Agent': 'QueMyDJ/1.0 (+https://quemydj.com)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (res.status === 429 || res.status >= 500) {
      setProviderCooldown('audius', res.headers.get('retry-after'));
      return { tracks: [], ok: false };
    }

    if (!res.ok) return { tracks: [], ok: false };

    const audiusData = (await res.json()) as { data?: AudiusTrackItem[] };
    const tracks: Song[] = (audiusData.data || [])
      .filter((t) => t && t.title && t.is_streamable !== false && (t.stream?.url || t.id))
      .slice(0, limit)
      .map((t) => {
        const durSec = t.duration || 180;
        const cover =
          t.artwork?.['480x480'] ||
          t.artwork?.['1000x1000'] ||
          t.artwork?.['150x150'] ||
          'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80';
        const streamUrl =
          t.stream?.url ||
          `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=cuemydj`;

        return {
          id: `audius-${t.id}`,
          title: t.title,
          artist: t.user?.name || 'Independent Artist',
          album: 'Audius Open Release',
          duration: formatDuration(durSec),
          durationMs: durSec * 1000,
          coverUrl: cover,
          genre: t.genre || 'Afrobeats / World',
          releaseYear: t.release_date ? new Date(t.release_date).getFullYear() || 2024 : 2024,
          bpm: t.bpm ? Math.round(t.bpm) : 115,
          musicalKey: t.musical_key || '8A',
          previewUrl: streamUrl,
          source: 'catalog',
          availability: 'authorized_provider',
          isFullLength: true,
          audioMetadata: {
            bitrate: 320,
            sampleRate: 44100,
            format: 'MP3',
            qualityTier: 'High',
            bpm: t.bpm ? Math.round(t.bpm) : 115,
            key: t.musical_key || '8A',
          },
        };
      });

    return { tracks, ok: true };
  } catch (err) {
    console.warn('[Music Search] Audius provider error:', err);
    return { tracks: [], ok: false };
  }
}

async function searchITunes(query: string, limit: number): Promise<{ tracks: Song[]; ok: boolean }> {
  if (isProviderCoolingDown('itunes')) {
    return { tracks: [], ok: false };
  }
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&entity=song&limit=${limit}`;

    const res = await fetch(itunesUrl, {
      headers: {
        'User-Agent': 'QueMyDJ/1.0 (+https://quemydj.com)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (res.status === 429 || res.status >= 500) {
      setProviderCooldown('itunes', res.headers.get('retry-after'));
      return { tracks: [], ok: false };
    }

    if (!res.ok) return { tracks: [], ok: false };

    const data = (await res.json()) as { results?: ITunesTrack[] };
    const tracks: Song[] = (data.results || [])
      .filter((t) => Boolean(t?.trackId && t?.trackName))
      .map((t) => {
        const durationSeconds = t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : 210;
        const highResArt = t.artworkUrl100
          ? t.artworkUrl100.replace('100x100bb', '600x600bb')
          : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

        return {
          id: `itunes-${t.trackId}`,
          title: t.trackName,
          artist: t.artistName,
          album: t.collectionName || 'Single',
          duration: formatDuration(durationSeconds),
          durationMs: t.trackTimeMillis || durationSeconds * 1000,
          coverUrl: highResArt,
          genre: t.primaryGenreName || 'Afrobeats / Pop',
          releaseYear: t.releaseDate ? new Date(t.releaseDate).getFullYear() || 2024 : 2024,
          bpm: 120 + ((t.trackName.length * 2) % 15),
          musicalKey: `${(t.trackName.length % 12) + 1}A`,
          previewUrl: t.previewUrl,
          source: 'itunes',
          availability: t.previewUrl ? 'authorized_provider' : 'discovery_only',
          externalUrl: t.trackViewUrl,
          audioMetadata: {
            bitrate: 256,
            sampleRate: 44100,
            format: 'AAC',
            qualityTier: 'High',
          },
        };
      });

    return { tracks, ok: true };
  } catch (err) {
    console.warn('[Music Search] iTunes provider error:', err);
    return { tracks: [], ok: false };
  }
}

interface YouTubeRendererItem {
  videoId?: string;
  title?: { runs?: { text?: string }[] };
  ownerText?: { runs?: { text?: string }[] };
  longBylineText?: { runs?: { text?: string }[] };
  lengthText?: { simpleText?: string };
  thumbnail?: { thumbnails?: { url?: string }[] };
}

function extractYouTubeRenderers(node: unknown, out: YouTubeRendererItem[], limit: number): void {
  if (!node || typeof node !== 'object' || out.length >= limit) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      if (out.length >= limit) break;
      extractYouTubeRenderers(item, out, limit);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  if (record.videoRenderer && typeof record.videoRenderer === 'object') {
    out.push(record.videoRenderer as YouTubeRendererItem);
    return;
  }

  for (const val of Object.values(record)) {
    if (out.length >= limit) break;
    if (val && typeof val === 'object') {
      extractYouTubeRenderers(val, out, limit);
    }
  }
}

async function searchYouTube(query: string, limit: number): Promise<{ tracks: Song[]; ok: boolean }> {
  if (isProviderCoolingDown('youtube')) {
    return { tracks: [], ok: false };
  }

  // 1. Official YouTube Data API v3 when YOUTUBE_API_KEY is configured
  const ytApiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (ytApiKey && !ytApiKey.toLowerCase().includes('placeholder')) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=${limit}&q=${encodeURIComponent(
        query
      )}&key=${encodeURIComponent(ytApiKey)}`;
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
      if (res.status === 429 || res.status >= 500) {
        setProviderCooldown('youtube', res.headers.get('retry-after'));
      } else if (res.ok) {
        const json = (await res.json()) as {
          items?: Array<{
            id?: { videoId?: string };
            snippet?: {
              title?: string;
              channelTitle?: string;
              publishedAt?: string;
              thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
            };
          }>;
        };
        const tracks: Song[] = (json.items || [])
          .filter((item) => Boolean(item.id?.videoId && item.snippet?.title))
          .map((item) => {
            const videoId = item.id!.videoId!;
            const title = item.snippet?.title || 'YouTube Track';
            return {
              id: `yt-${videoId}`,
              title,
              artist: item.snippet?.channelTitle || 'YouTube Music',
              album: 'YouTube Video / Remix',
              duration: '3:30',
              coverUrl:
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              genre: 'Remix / YouTube',
              releaseYear: item.snippet?.publishedAt
                ? new Date(item.snippet.publishedAt).getFullYear() || 2024
                : 2024,
              bpm: 118,
              musicalKey: '8A',
              source: 'youtube',
              youtubeVideoId: videoId,
              externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
              availability: 'discovery_only',
              audioMetadata: {
                qualityTier: 'Standard',
                format: 'YouTube',
              },
            };
          });
        return { tracks, ok: true };
      }
    } catch (err) {
      console.warn('[Music Search] YouTube Data API error, trying fallback:', err);
    }
  }

  // 2. Resilient public ytInitialData search extraction
  try {
    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${query} audio`
    )}&sp=EgIQAQ%253D%253D`;
    const res = await fetch(ytSearchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });

    if (res.status === 429 || res.status >= 500) {
      setProviderCooldown('youtube', res.headers.get('retry-after'));
      return { tracks: [], ok: false };
    }

    if (!res.ok) return { tracks: [], ok: false };

    const html = await res.text();
    const match = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
    if (!match || !match[1]) {
      return { tracks: [], ok: false };
    }

    const parsed = JSON.parse(match[1]) as unknown;
    const renderers: YouTubeRendererItem[] = [];
    extractYouTubeRenderers(parsed, renderers, limit);

    const tracks: Song[] = renderers
      .filter((r) => Boolean(r.videoId))
      .map((r) => {
        const videoId = r.videoId!;
        const title = r.title?.runs?.map((run) => run.text || '').join('') || 'YouTube Mix';
        const channel =
          r.ownerText?.runs?.[0]?.text ||
          r.longBylineText?.runs?.[0]?.text ||
          'YouTube Creator';
        const duration = r.lengthText?.simpleText || '3:30';
        const thumbs = r.thumbnail?.thumbnails || [];
        const coverUrl =
          thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        return {
          id: `yt-${videoId}`,
          title,
          artist: channel,
          album: 'YouTube Remix / Edit',
          duration,
          coverUrl,
          genre: 'Remix / Live Edit',
          releaseYear: 2024,
          bpm: 118 + (title.length % 12),
          musicalKey: `${(title.length % 12) + 1}A`,
          source: 'youtube',
          youtubeVideoId: videoId,
          externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          availability: 'discovery_only',
          audioMetadata: {
            qualityTier: 'Standard',
            format: 'YouTube',
          },
        };
      });

    return { tracks, ok: true };
  } catch (err) {
    console.warn('[Music Search] YouTube search fallback error:', err);
    return { tracks: [], ok: false };
  }
}

function resolveProviders(rawType: string): ProviderName[] {
  const normalized = rawType.toLowerCase() as SearchType;
  switch (normalized) {
    case 'audius':
      return ['audius'];
    case 'itunes':
      return ['itunes'];
    case 'official':
    case 'streaming':
      return ['audius', 'itunes'];
    case 'youtube':
      return ['youtube'];
    case 'all':
    default:
      return ['audius', 'itunes', 'youtube'];
  }
}

function searchLocalFallbackCatalog(query: string, limit: number): Song[] {
  const q = query.toLowerCase();
  return MOCK_SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      s.album.toLowerCase().includes(q)
  ).slice(0, limit);
}

function deduplicateTracks(tracks: Song[]): Song[] {
  const seenIds = new Set<string>();
  const out: Song[] = [];
  for (const track of tracks) {
    if (seenIds.has(track.id)) continue;
    seenIds.add(track.id);
    out.push(track);
  }
  return out;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');
  const type = (searchParams.get('type') || 'all').toLowerCase();
  const limitParam = parseInt(searchParams.get('limit') || '12', 10);
  const limit = Number.isFinite(limitParam) ? Math.min(25, Math.max(1, limitParam)) : 12;

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [], cached: false, providers: [] });
  }

  const cleanQuery = query.trim();
  const normalizedKey = `${type}:${cleanQuery.toLowerCase()}:${limit}`;
  const cache = getCache();
  const cachedEntry = cache.get(normalizedKey);
  const now = Date.now();

  if (cachedEntry && now < cachedEntry.expiresAt) {
    return NextResponse.json(
      {
        results: cachedEntry.results,
        cached: true,
        degraded: false,
        providers: cachedEntry.providers,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  }

  const providers = resolveProviders(type);
  const inFlight = getInFlight();

  try {
    let searchPromise = inFlight.get(normalizedKey);
    if (!searchPromise) {
      searchPromise = (async () => {
        const providerTasks = providers.map(async (p) => {
          if (p === 'audius') return { provider: p, ...(await searchAudius(cleanQuery, limit)) };
          if (p === 'itunes') return { provider: p, ...(await searchITunes(cleanQuery, limit)) };
          return { provider: p, ...(await searchYouTube(cleanQuery, Math.min(limit, 8))) };
        });

        const settled = await Promise.allSettled(providerTasks);
        const aggregated: Song[] = [];
        const succeededProviders: ProviderName[] = [];
        let anyFailed = false;

        for (const outcome of settled) {
          if (outcome.status === 'fulfilled') {
            if (outcome.value.ok) {
              succeededProviders.push(outcome.value.provider);
              aggregated.push(...outcome.value.tracks);
            } else {
              anyFailed = true;
            }
          } else {
            anyFailed = true;
          }
        }

        const deduped = deduplicateTracks(aggregated);
        return {
          results: deduped,
          providers: succeededProviders,
          degraded: anyFailed,
        };
      })();

      inFlight.set(normalizedKey, searchPromise);
    }

    const { results, providers: succeededProviders, degraded } = await searchPromise;
    inFlight.delete(normalizedKey);

    if (results.length > 0) {
      setCacheEntry(normalizedKey, results, succeededProviders);
      return NextResponse.json(
        {
          results,
          cached: false,
          degraded,
          providers: succeededProviders,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      );
    }

    // Serve stale cache if upstream failed or was rate-limited
    if (cachedEntry && now < cachedEntry.staleUntil) {
      return NextResponse.json(
        {
          results: cachedEntry.results,
          cached: true,
          stale: true,
          degraded: true,
          providers: cachedEntry.providers,
        },
        { status: 200 }
      );
    }

    // Last-resort local catalog fallback when upstream providers failed completely
    if (degraded && type !== 'youtube') {
      const localMatches = searchLocalFallbackCatalog(cleanQuery, limit);
      if (localMatches.length > 0) {
        setCacheEntry(normalizedKey, localMatches, []);
      }
      return NextResponse.json({
        results: localMatches,
        cached: false,
        degraded: true,
        fallback: localMatches.length > 0 ? 'local_catalog' : undefined,
        providers: [],
      });
    }

    return NextResponse.json({
      results: [],
      cached: false,
      degraded,
      providers: succeededProviders,
    });
  } catch (error) {
    inFlight.delete(normalizedKey);
    console.warn('Music search unexpected recovery:', error);

    if (cachedEntry) {
      return NextResponse.json({
        results: cachedEntry.results,
        cached: true,
        stale: true,
        degraded: true,
        providers: cachedEntry.providers,
      });
    }

    const localMatches = searchLocalFallbackCatalog(cleanQuery, limit);
    return NextResponse.json({
      results: localMatches,
      cached: false,
      degraded: true,
      fallback: 'local_catalog',
      providers: [],
    });
  }
}
