'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DJ, Song, SongRequest, RequestStatus, GuestUser, WalletTransaction, ClubVenue, DisputeRecord, VenueCommissionSplit } from '@/types';
import { MOCK_DJS, MOCK_SONGS, INITIAL_REQUESTS } from '@/data/mockData';
import { INITIAL_VENUES, INITIAL_DISPUTES } from '@/data/mockAdminData';
import {
  saveTrackToCrateDB,
  getAllTracksFromCrateDB,
  deleteTrackFromCrateDB
} from '@/services/crateIndexedDB';
import {
  fetchSessionRequestsFromDb,
  insertSongRequestToDb,
  updateSongRequestStatusInDb,
  subscribeToSessionRealtime,
} from '@/services/realtimeSyncService';
import { getSupabaseClient } from '@/services/supabaseClient';

interface CueAppContextType {
  // Theme Mode
  themeMode: 'dark' | 'light';
  setThemeMode: (mode: 'dark' | 'light') => void;
  toggleThemeMode: () => void;

  // Role & Authentication Session
  userRole: 'guest' | 'dj';
  setUserRole: (role: 'guest' | 'dj') => void;
  isDjAuthenticated: boolean;
  loginAsDj: (djId?: string) => void;
  logoutDj: () => void;

  // Guest Account & Night Wallet
  currentUser: GuestUser;
  walletTransactions: WalletTransaction[];
  topUpGuestWallet: (amount: number, description?: string) => void;
  payWithWallet: (amount: number, description: string) => boolean;
  registerOrUpdateGuest: (name: string, phoneOrEmail?: string) => GuestUser;
  logoutGuest: () => void;

  // DJs and Sessions
  djs: DJ[];
  currentDj: DJ; // DJ Kofi Beats as active DJ
  updateDjSessionStatus: (isAccepting: boolean) => void;
  updateDjSessionDetails: (details: Partial<NonNullable<DJ['liveSession']>>) => void;
  updateDjProfile: (updates: {
    name?: string;
    handle?: string;
    bio?: string;
    genres?: string[];
    basePrice?: number;
    passcode?: string;
  }) => void;

  // Requests
  requests: SongRequest[];
  createRequest: (data: {
    sessionId: string;
    djId: string;
    song: Song;
    guestName: string;
    guestNote?: string;
    amount: number;
    tip?: number;
    paymentMethod: 'Apple Pay' | 'Credit Card' | 'Cash App' | 'Demo Wallet' | 'Paystack';
    paymentReference?: string;
    paymentVerifiedServerSide?: boolean;
  }) => SongRequest;
  updateRequestStatus: (
    requestId: string,
    newStatus: RequestStatus,
    reason?: string
  ) => void;
  provideRequestFeedback: (
    requestId: string,
    feedback: 'played_confirmed' | 'reported_problem',
    note?: string
  ) => void;

  // Songs & DJ Local Music Library
  songs: Song[];
  djLibrary: Song[];
  addSongToDjLibrary: (song: Song) => void;
  removeSongFromDjLibrary: (songId: string) => void;
  searchSongs: (query: string) => Song[];
  processRefund: (requestId: string, reason?: string) => void;

  // Guest Location Simulation
  userLocation: {
    city: string;
    hasPermission: boolean;
  };
  setUserLocation: (loc: { city: string; hasPermission: boolean }) => void;

  // Venues, Split Engine & Umpire Admin
  venues: ClubVenue[];
  activeVenue: ClubVenue;
  setActiveVenueId: (venueId: string) => void;
  updateVenueSplit: (venueId: string, split: VenueCommissionSplit) => void;
  addVenue: (venue: Omit<ClubVenue, 'id' | 'totalRevenueGenerated' | 'totalCommissionPaid'>) => void;
  disputes: DisputeRecord[];
  resolveDispute: (disputeId: string, action: 'refund_guest' | 'release_to_dj', note?: string) => void;

  // Reset to initial demo state
  resetDemoData: () => void;
}

const CueAppContext = createContext<CueAppContextType | undefined>(undefined);

const STORAGE_KEY_REQUESTS = 'cuemydj_requests_prod_v2';
const STORAGE_KEY_ROLE = 'cuemydj_role_prod_v1';
const STORAGE_KEY_DJS = 'cuemydj_djs_prod_v2';
const STORAGE_KEY_LIBRARY = 'cuemydj_library_prod_v1';
const STORAGE_KEY_THEME = 'cuemydj_theme_mode_v1';
const STORAGE_KEY_GUEST_USER = 'cuemydj_guest_user_v2';
const STORAGE_KEY_WALLET_TX = 'cuemydj_wallet_tx_v2';
const STORAGE_KEY_DJ_AUTH = 'cuemydj_dj_auth_v1';
const STORAGE_KEY_VENUES = 'cuemydj_venues_v2';
const STORAGE_KEY_DISPUTES = 'cuemydj_disputes_v2';
const STORAGE_KEY_ACTIVE_VENUE_ID = 'cuemydj_active_venue_id_v1';

const ANONYMOUS_GUEST: GuestUser = {
  id: 'guest_anon',
  name: 'Guest',
  phoneOrEmail: '',
  isRegistered: false,
  walletBalance: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const EMPTY_DJ_PLACEHOLDER: DJ = {
  id: 'loading-dj',
  name: 'Resident DJ',
  handle: '@dj',
  avatarUrl:
    'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=300&auto=format&fit=crop&q=80',
  bannerUrl:
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop',
  bio: '',
  genres: [],
  rating: 5.0,
  totalSets: 0,
  currentVenue: {
    name: 'Live Booth',
    city: 'Lagos',
    distance: 'Live',
    address: '',
    lat: 6.4281,
    lng: 3.4219,
  },
  liveSession: {
    id: 'session-pending',
    title: 'Live Set',
    startTime: '10:00 PM',
    endTime: '04:00 AM',
    isAcceptingRequests: true,
    basePrice: 5000,
    serviceFee: 500,
    requestRules: [],
    passcode: '',
  },
};

export function CueAppProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<'dark' | 'light'>('dark');
  const [userRole, setUserRoleState] = useState<'guest' | 'dj'>('guest');
  const [isDjAuthenticated, setIsDjAuthenticated] = useState<boolean>(false);
  const [authenticatedDjId, setAuthenticatedDjId] = useState<string | null>(null);
  const [djs, setDjs] = useState<DJ[]>([]);
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [djLibrary, setDjLibrary] = useState<Song[]>([]);
  const [currentUser, setCurrentUser] = useState<GuestUser>(ANONYMOUS_GUEST);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [venues, setVenues] = useState<ClubVenue[]>(INITIAL_VENUES);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [activeVenueId, setActiveVenueIdState] = useState<string>('venue-skyline');

  const currentDj =
    (authenticatedDjId && djs.find((d) => d.id === authenticatedDjId)) ||
    djs[0] ||
    EMPTY_DJ_PLACEHOLDER;
  const activeVenue = venues.find((v) => v.id === activeVenueId) || venues[0];

  // Sync persisted state after client hydration so SSR and initial client render match 100%
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as 'dark' | 'light' | null;
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeModeState(savedTheme);
          document.documentElement.setAttribute('data-theme', savedTheme);
          if (savedTheme === 'light') {
            document.documentElement.classList.add('theme-light');
            document.documentElement.classList.remove('dark');
          } else {
            document.documentElement.classList.remove('theme-light');
            document.documentElement.classList.add('dark');
          }
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.classList.remove('theme-light');
          document.documentElement.classList.add('dark');
        }

        const savedDjAuth = localStorage.getItem(STORAGE_KEY_DJ_AUTH);
        if (savedDjAuth !== null) {
          setIsDjAuthenticated(savedDjAuth === 'true');
        }

        const savedRole = localStorage.getItem(STORAGE_KEY_ROLE) as 'guest' | 'dj' | null;
        if (savedRole) {
          setUserRoleState(savedRole);
        }

        const savedDjs = localStorage.getItem(STORAGE_KEY_DJS);
        if (savedDjs) {
          setDjs(JSON.parse(savedDjs));
        }

        const savedReqs = localStorage.getItem(STORAGE_KEY_REQUESTS);
        if (savedReqs) {
          setRequests(JSON.parse(savedReqs));
        }

        const savedLib = localStorage.getItem(STORAGE_KEY_LIBRARY);
        if (savedLib) {
          setDjLibrary(JSON.parse(savedLib));
        }

        const savedGuest = localStorage.getItem(STORAGE_KEY_GUEST_USER);
        if (savedGuest) {
          setCurrentUser(JSON.parse(savedGuest));
        }

        const savedTx = localStorage.getItem(STORAGE_KEY_WALLET_TX);
        if (savedTx) {
          setWalletTransactions(JSON.parse(savedTx));
        }
      } catch {}
    });

    // Rehydrate local audio blobs from persistent IndexedDB
    getAllTracksFromCrateDB().then((idbTracks) => {
      if (!cancelled && idbTracks && idbTracks.length > 0) {
        const restored: Song[] = idbTracks.map((item) => {
          const meta = item.metadata as unknown as Song;
          const objectUrl = item.audioBlob ? URL.createObjectURL(item.audioBlob) : meta.previewUrl;
          return {
            ...meta,
            id: item.id,
            previewUrl: objectUrl,
            availability: 'in_library',
          };
        });

        setDjLibrary((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = restored.filter((r) => !existingIds.has(r.id));
          return [...newOnes, ...prev];
        });
      }
    }).catch((e) => console.warn('IndexedDB load notice:', e));

    // Load real registered DJs from Supabase (/api/djs)
    fetch('/api/djs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.source === 'supabase' && Array.isArray(data.djs)) {
          setDjs(data.djs);
          try {
            localStorage.setItem(STORAGE_KEY_DJS, JSON.stringify(data.djs));
          } catch {}
          // Fetch live requests for the active DJ session from Supabase
          const firstSessionId = data.djs[0]?.liveSession?.id;
          if (firstSessionId) {
            fetchSessionRequestsFromDb(firstSessionId)
              .then((dbReqs) => {
                if (!cancelled && dbReqs) {
                  setRequests(dbReqs);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});

    // Sync Supabase Auth state if client configured
    const supabase = getSupabaseClient();
    let authListenerSubscription: { unsubscribe: () => void } | null = null;
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled || !session?.user) return;
        const u = session.user;
        const role = u.user_metadata?.role;
        const name = u.user_metadata?.name || u.email?.split('@')[0] || 'User';

        if (role === 'dj') {
          setIsDjAuthenticated(true);
          setAuthenticatedDjId(u.id);
          setUserRoleState('dj');
          try {
            localStorage.setItem(STORAGE_KEY_DJ_AUTH, 'true');
            localStorage.setItem(STORAGE_KEY_ROLE, 'dj');
          } catch {}
        } else {
          setCurrentUser((prev) => {
            const updated: GuestUser = {
              ...prev,
              id: u.id,
              name,
              phoneOrEmail: u.email || prev.phoneOrEmail,
              isRegistered: true,
            };
            try {
              localStorage.setItem(STORAGE_KEY_GUEST_USER, JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      }).catch(() => {});

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        if (session?.user) {
          const u = session.user;
          const role = u.user_metadata?.role;
          const name = u.user_metadata?.name || u.email?.split('@')[0] || 'User';

          if (role === 'dj') {
            setIsDjAuthenticated(true);
            setAuthenticatedDjId(u.id);
            setUserRoleState('dj');
            try {
              localStorage.setItem(STORAGE_KEY_DJ_AUTH, 'true');
              localStorage.setItem(STORAGE_KEY_ROLE, 'dj');
            } catch {}
            // Refresh DJs list from Supabase so newly registered DJs appear immediately
            fetch('/api/djs')
              .then((res) => (res.ok ? res.json() : null))
              .then((djData) => {
                if (!cancelled && djData?.source === 'supabase' && Array.isArray(djData.djs) && djData.djs.length > 0) {
                  setDjs(djData.djs);
                }
              })
              .catch(() => {});
          } else {
            setCurrentUser((prev) => {
              const updated: GuestUser = {
                ...prev,
                id: u.id,
                name,
                phoneOrEmail: u.email || prev.phoneOrEmail,
                isRegistered: true,
              };
              try {
                localStorage.setItem(STORAGE_KEY_GUEST_USER, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        }
      });
      authListenerSubscription = data.subscription;
    }

    return () => {
      cancelled = true;
      if (authListenerSubscription) {
        authListenerSubscription.unsubscribe();
      }
    };
  }, []);

  // Real-time Supabase subscription: instantly pop up incoming requests & sync status
  useEffect(() => {
    const activeSessionId = currentDj.liveSession?.id || 'session-skyline-friday';

    const unsubscribe = subscribeToSessionRealtime(
      activeSessionId,
      (newRequest) => {
        setRequests((prev) => {
          if (prev.some((r) => r.id === newRequest.id || r.referenceCode === newRequest.referenceCode)) {
            return prev;
          }
          const updated = [newRequest, ...prev];
          try {
            localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      },
      (updatedRequest) => {
        setRequests((prev) => {
          const updated = prev.map((r) =>
            r.id === updatedRequest.id || r.referenceCode === updatedRequest.referenceCode
              ? updatedRequest
              : r
          );
          try {
            localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentDj.liveSession?.id]);

  const addSongToDjLibrary = (song: Song) => {
    const updated = [song, ...djLibrary.filter((s) => s.id !== song.id)];
    setDjLibrary(updated);
    try {
      localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(updated.map(s => ({ ...s, audioFile: undefined }))));
    } catch {}

    // Persist audio file blob to IndexedDB
    if (song.audioFile) {
      saveTrackToCrateDB({
        id: song.id,
        metadata: {
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          durationMs: song.durationMs,
          coverUrl: song.coverUrl,
          genre: song.genre,
          releaseYear: song.releaseYear,
          bpm: song.bpm,
          musicalKey: song.musicalKey,
          availability: 'in_library',
          audioMetadata: song.audioMetadata,
          waveformPeaks: song.waveformPeaks,
        },
        audioBlob: song.audioFile,
      }).catch((err) => console.warn('Failed to store track in IndexedDB:', err));
    }
  };

  const removeSongFromDjLibrary = (songId: string) => {
    const updated = djLibrary.filter((s) => s.id !== songId);
    setDjLibrary(updated);
    try {
      localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(updated));
    } catch {}
    deleteTrackFromCrateDB(songId).catch(() => {});
  };

  const [userLocation, setUserLocation] = useState({
    city: 'Downtown Brooklyn, NY',
    hasPermission: true,
  });

  const setUserRole = (role: 'guest' | 'dj') => {
    setUserRoleState(role);
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, role);
    } catch {}
  };

  const saveRequests = (newReqs: SongRequest[]) => {
    setRequests(newReqs);
    try {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(newReqs));
    } catch {}
  };

  const saveDjs = (newDjs: DJ[]) => {
    setDjs(newDjs);
    try {
      localStorage.setItem(STORAGE_KEY_DJS, JSON.stringify(newDjs));
    } catch {}
  };

  const updateDjSessionStatus = (isAccepting: boolean) => {
    let targetLiveSession: DJ['liveSession'] | undefined;
    const updated = djs.map((d) => {
      if (d.id === currentDj.id && d.liveSession) {
        targetLiveSession = {
          ...d.liveSession,
          isAcceptingRequests: isAccepting,
        };
        return {
          ...d,
          liveSession: targetLiveSession,
        };
      }
      return d;
    });
    saveDjs(updated);
    if (typeof window !== 'undefined') {
      fetch('/api/djs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDj.id,
          isAcceptingRequests: isAccepting,
          liveSession: targetLiveSession,
        }),
      }).catch(() => {});
    }
  };

  const updateDjSessionDetails = (details: Partial<NonNullable<DJ['liveSession']>>) => {
    let targetLiveSession: DJ['liveSession'] | undefined;
    const updated = djs.map((d) => {
      if (d.id === currentDj.id && d.liveSession) {
        targetLiveSession = {
          ...d.liveSession,
          ...details,
        };
        return {
          ...d,
          liveSession: targetLiveSession,
        };
      }
      return d;
    });
    saveDjs(updated);
    if (typeof window !== 'undefined') {
      fetch('/api/djs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDj.id,
          basePrice: details.basePrice,
          passcode: details.passcode,
          liveSession: targetLiveSession,
        }),
      }).catch(() => {});
    }
  };

  const updateDjProfile = (updates: {
    name?: string;
    handle?: string;
    bio?: string;
    genres?: string[];
    basePrice?: number;
    passcode?: string;
  }) => {
    let targetLiveSession: DJ['liveSession'] | undefined;
    const updated = djs.map((d) => {
      if (d.id === currentDj.id) {
        targetLiveSession = d.liveSession
          ? {
              ...d.liveSession,
              basePrice: updates.basePrice !== undefined ? updates.basePrice : d.liveSession.basePrice,
              passcode: updates.passcode !== undefined ? updates.passcode : d.liveSession.passcode,
            }
          : d.liveSession;
        return {
          ...d,
          name: updates.name !== undefined ? updates.name : d.name,
          handle: updates.handle !== undefined ? updates.handle : d.handle,
          bio: updates.bio !== undefined ? updates.bio : d.bio,
          genres: updates.genres !== undefined ? updates.genres : d.genres,
          liveSession: targetLiveSession,
        };
      }
      return d;
    });
    saveDjs(updated);
    if (typeof window !== 'undefined') {
      fetch('/api/djs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentDj.id,
          ...updates,
          liveSession: targetLiveSession,
        }),
      }).catch(() => {});
    }
  };

  const createRequest = ({
    sessionId,
    djId,
    song,
    guestName,
    guestNote,
    amount,
    tip = 0,
    paymentMethod,
    paymentReference,
    paymentVerifiedServerSide = false,
  }: {
    sessionId: string;
    djId: string;
    song: Song;
    guestName: string;
    guestNote?: string;
    amount: number;
    tip?: number;
    paymentMethod: 'Apple Pay' | 'Credit Card' | 'Cash App' | 'Demo Wallet' | 'Paystack';
    paymentReference?: string;
    paymentVerifiedServerSide?: boolean;
  }): SongRequest => {
    const targetDj = djs.find((d) => d.id === djId) || currentDj;
    const serviceFee = targetDj.liveSession?.serviceFee || 500;
    const totalAmount = amount + tip + serviceFee;
    const randomRefNum = Math.floor(1000 + Math.random() * 9000);
    const refCode = paymentReference || `CMDJ-${randomRefNum}`;

    const newRequest: SongRequest = {
      id: `req-${Date.now()}`,
      referenceCode: refCode,
      sessionId,
      djId: targetDj.id,
      djName: targetDj.name,
      djAvatar: targetDj.avatarUrl,
      venueName: targetDj.currentVenue.name,
      song,
      guestName: guestName || 'Anonymous Guest',
      guestNote,
      amount: amount + tip,
      serviceFee,
      total: totalAmount,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidVia: paymentMethod,
      paymentReference: refCode,
      paymentVerifiedServerSide,
    };

    const next = [newRequest, ...requests];
    saveRequests(next);
    // Broadcast / persist to Supabase Realtime channel + REST backend
    insertSongRequestToDb(newRequest).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newRequest.id,
          sessionId,
          djId: targetDj.id,
          song,
          guestName: newRequest.guestName,
          guestNote,
          amount,
          tip,
          paidVia: paymentMethod,
          paymentReference: refCode,
          paymentVerifiedServerSide,
        }),
      }).catch(() => {});
    }
    return newRequest;
  };

  const updateRequestStatus = (
    requestId: string,
    newStatus: RequestStatus,
    reason?: string
  ) => {
    const next = requests.map((req) => {
      if (req.id === requestId) {
        return {
          ...req,
          status: newStatus,
          declineReason: reason || req.declineReason,
          updatedAt: new Date().toISOString(),
        };
      }
      return req;
    });
    saveRequests(next);
    // Sync status change to Supabase Realtime channel + REST API
    updateSongRequestStatusInDb(requestId, newStatus, reason).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, declineReason: reason }),
      }).catch(() => {});
    }
  };

  const processRefund = (requestId: string, reason?: string) => {
    const next = requests.map((req) => {
      if (req.id === requestId) {
        return {
          ...req,
          status: 'refunded' as RequestStatus,
          declineReason: reason || 'Declined by DJ & refunded',
          refundTxId: `ref-${Date.now().toString(36)}`,
          refundedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return req;
    });
    saveRequests(next);
    // Sync status change to Supabase Realtime channel + REST API
    updateSongRequestStatusInDb(requestId, 'refunded', reason).catch(() => {});
    if (typeof window !== 'undefined') {
      fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'refunded',
          declineReason: reason || 'Declined by DJ & refunded',
        }),
      }).catch(() => {});
    }
  };

  const provideRequestFeedback = (
    requestId: string,
    feedback: 'played_confirmed' | 'reported_problem',
    note?: string
  ) => {
    const next = requests.map((req) => {
      if (req.id === requestId) {
        return {
          ...req,
          feedbackGiven: feedback,
          feedbackNote: note,
          updatedAt: new Date().toISOString(),
        };
      }
      return req;
    });
    saveRequests(next);
    if (typeof window !== 'undefined') {
      fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackGiven: feedback,
          feedbackNote: note,
        }),
      }).catch(() => {});
    }
  };

  const searchSongs = (query: string): Song[] => {
    if (!query.trim()) return [...djLibrary, ...MOCK_SONGS];
    const q = query.toLowerCase();
    const all = [...djLibrary, ...MOCK_SONGS];
    return all.filter(
      (s, idx, self) =>
        self.findIndex((item) => item.id === s.id) === idx &&
        (s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q))
    );
  };

  const setThemeMode = (mode: 'dark' | 'light') => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, mode);
      document.documentElement.setAttribute('data-theme', mode);
      if (mode === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.classList.add('dark');
      }
    } catch {}
  };

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  };

  // Guest Wallet Operations
  const topUpGuestWallet = (amount: number, description = 'Club Night Wallet Top-Up') => {
    const updatedBalance = (currentUser?.walletBalance || 0) + amount;
    const user: GuestUser = currentUser || {
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      phoneOrEmail: '',
      isRegistered: true,
      walletBalance: 0,
      createdAt: new Date().toISOString(),
    };

    const updatedUser: GuestUser = {
      ...user,
      walletBalance: updatedBalance,
      isRegistered: true,
    };

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_USER, JSON.stringify(updatedUser));
    } catch {}

    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'topup',
      amount,
      description,
      createdAt: new Date().toISOString(),
      reference: `WAL-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const updatedTxs = [newTx, ...walletTransactions];
    setWalletTransactions(updatedTxs);
    try {
      localStorage.setItem(STORAGE_KEY_WALLET_TX, JSON.stringify(updatedTxs));
    } catch {}
  };

  const payWithWallet = (amount: number, description: string): boolean => {
    if (!currentUser || currentUser.walletBalance < amount) {
      return false;
    }

    const updatedBalance = currentUser.walletBalance - amount;
    const updatedUser: GuestUser = {
      ...currentUser,
      walletBalance: updatedBalance,
    };

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_USER, JSON.stringify(updatedUser));
    } catch {}

    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: 'request_payment',
      amount,
      description,
      createdAt: new Date().toISOString(),
      reference: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const updatedTxs = [newTx, ...walletTransactions];
    setWalletTransactions(updatedTxs);
    try {
      localStorage.setItem(STORAGE_KEY_WALLET_TX, JSON.stringify(updatedTxs));
    } catch {}

    return true;
  };

  const registerOrUpdateGuest = (name: string, phoneOrEmail?: string): GuestUser => {
    const existing = currentUser || {
      id: `guest_${Date.now()}`,
      name: 'Club Guest',
      phoneOrEmail: '',
      isRegistered: false,
      walletBalance: 0,
      createdAt: new Date().toISOString(),
    };

    const updatedUser: GuestUser = {
      ...existing,
      name: name.trim() || existing.name || 'Club Guest',
      phoneOrEmail: phoneOrEmail ? phoneOrEmail.trim() : existing.phoneOrEmail,
      isRegistered: true,
      walletBalance: existing.walletBalance || 0,
      createdAt: existing.createdAt || new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_USER, JSON.stringify(updatedUser));
    } catch {}

    return updatedUser;
  };

  const logoutGuest = () => {
    setCurrentUser(ANONYMOUS_GUEST);
    try {
      localStorage.setItem(STORAGE_KEY_GUEST_USER, JSON.stringify(ANONYMOUS_GUEST));
    } catch {}
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const loginAsDj = (djId = 'dj-kofi') => {
    setIsDjAuthenticated(true);
    setUserRoleState('dj');
    try {
      localStorage.setItem(STORAGE_KEY_DJ_AUTH, 'true');
      localStorage.setItem(STORAGE_KEY_ROLE, 'dj');
    } catch {}
  };

  const logoutDj = () => {
    setIsDjAuthenticated(false);
    setUserRoleState('guest');
    try {
      localStorage.setItem(STORAGE_KEY_DJ_AUTH, 'false');
      localStorage.setItem(STORAGE_KEY_ROLE, 'guest');
    } catch {}
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const setActiveVenueId = (venueId: string) => {
    setActiveVenueIdState(venueId);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_VENUE_ID, venueId);
    } catch {}
  };

  const updateVenueSplit = (venueId: string, split: VenueCommissionSplit) => {
    setVenues((prev) => {
      const updated = prev.map((v) => (v.id === venueId ? { ...v, commissionSplit: split } : v));
      try {
        localStorage.setItem(STORAGE_KEY_VENUES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (typeof window !== 'undefined') {
      fetch('/api/admin/venues/splits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId, commissionSplit: split }),
      }).catch(() => {});
    }
  };

  const addVenue = (venueData: Omit<ClubVenue, 'id' | 'totalRevenueGenerated' | 'totalCommissionPaid'>) => {
    const newVenue: ClubVenue = {
      ...venueData,
      id: `venue-${Date.now()}`,
      totalRevenueGenerated: 0,
      totalCommissionPaid: 0,
    };
    setVenues((prev) => {
      const updated = [newVenue, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_VENUES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (typeof window !== 'undefined') {
      fetch('/api/venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venueData),
      }).catch(() => {});
    }
  };

  const resolveDispute = (disputeId: string, action: 'refund_guest' | 'release_to_dj', note?: string) => {
    setDisputes((prev) => {
      const updated = prev.map((d) => {
        if (d.id !== disputeId) return d;
        return {
          ...d,
          status: action === 'refund_guest' ? ('refunded' as const) : ('resolved_to_dj' as const),
          resolvedAt: new Date().toISOString(),
          resolutionNote: note || (action === 'refund_guest' ? 'Umpire forced full refund to guest.' : 'Dispute resolved in DJ favor; funds released.'),
        };
      });
      try {
        localStorage.setItem(STORAGE_KEY_DISPUTES, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (typeof window !== 'undefined') {
      fetch(`/api/admin/disputes/${encodeURIComponent(disputeId)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolutionNote: note }),
      }).catch(() => {});
    }
  };

  const resetDemoData = () => {
    setRequests([]);
    setDjs(MOCK_DJS);
    setDjLibrary([]);
    setVenues(INITIAL_VENUES);
    setDisputes(INITIAL_DISPUTES);
    try {
      localStorage.removeItem(STORAGE_KEY_REQUESTS);
      localStorage.removeItem(STORAGE_KEY_DJS);
      localStorage.removeItem(STORAGE_KEY_LIBRARY);
      localStorage.removeItem(STORAGE_KEY_VENUES);
      localStorage.removeItem(STORAGE_KEY_DISPUTES);
    } catch {}
  };

  return (
    <CueAppContext.Provider
      value={{
        themeMode,
        setThemeMode,
        toggleThemeMode,
        userRole,
        setUserRole,
        isDjAuthenticated,
        loginAsDj,
        logoutDj,
        currentUser,
        walletTransactions,
        venues,
        activeVenue,
        setActiveVenueId,
        updateVenueSplit,
        addVenue,
        disputes,
        resolveDispute,
        topUpGuestWallet,
        payWithWallet,
        registerOrUpdateGuest,
        logoutGuest,
        djs,
        currentDj,
        updateDjSessionStatus,
        updateDjSessionDetails,
        updateDjProfile,
        requests,
        createRequest,
        updateRequestStatus,
        provideRequestFeedback,
        processRefund,
        songs: MOCK_SONGS,
        djLibrary,
        addSongToDjLibrary,
        removeSongFromDjLibrary,
        searchSongs,
        userLocation,
        setUserLocation,
        resetDemoData,
      }}
    >
      {children}
    </CueAppContext.Provider>
  );
}

export function useCueApp() {
  const context = useContext(CueAppContext);
  if (!context) {
    throw new Error('useCueApp must be used within a CueAppProvider');
  }
  return context;
}
