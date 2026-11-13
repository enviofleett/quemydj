'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DJ, Song, SongRequest, RequestStatus, GuestUser, WalletTransaction } from '@/types';
import { MOCK_DJS, MOCK_SONGS, INITIAL_REQUESTS } from '@/data/mockData';
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
    paymentMethod: 'Apple Pay' | 'Credit Card' | 'Cash App' | 'Demo Wallet';
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

  // Reset to initial demo state
  resetDemoData: () => void;
}

const CueAppContext = createContext<CueAppContextType | undefined>(undefined);

const STORAGE_KEY_REQUESTS = 'cuemydj_requests_prod_v1';
const STORAGE_KEY_ROLE = 'cuemydj_role_prod_v1';
const STORAGE_KEY_DJS = 'cuemydj_djs_prod_v1';
const STORAGE_KEY_LIBRARY = 'cuemydj_library_prod_v1';
const STORAGE_KEY_THEME = 'cuemydj_theme_mode_v1';
const STORAGE_KEY_GUEST_USER = 'cuemydj_guest_user_v1';
const STORAGE_KEY_WALLET_TX = 'cuemydj_wallet_tx_v1';
const STORAGE_KEY_DJ_AUTH = 'cuemydj_dj_auth_v1';

const DEFAULT_GUEST: GuestUser = {
  id: 'guest_alex_rivers',
  name: 'Alex Rivers',
  phoneOrEmail: 'alex.rivers@icloud.com',
  isRegistered: true,
  walletBalance: 20000,
  createdAt: '2026-03-27T00:00:00.000Z',
};

const ANONYMOUS_GUEST: GuestUser = {
  id: 'guest_anon',
  name: 'VIP Club Guest',
  phoneOrEmail: '',
  isRegistered: false,
  walletBalance: 0,
  createdAt: new Date().toISOString(),
};

export function CueAppProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<'dark' | 'light'>('dark');
  const [userRole, setUserRoleState] = useState<'guest' | 'dj'>('dj');
  const [isDjAuthenticated, setIsDjAuthenticated] = useState<boolean>(true);
  const [djs, setDjs] = useState<DJ[]>(MOCK_DJS);
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [djLibrary, setDjLibrary] = useState<Song[]>([]);
  const [currentUser, setCurrentUser] = useState<GuestUser>(DEFAULT_GUEST);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);

  const currentDj = djs.find((d) => d.id === 'dj-kofi') || djs[0];

  // Sync persisted state after client hydration so SSR and initial client render match 100%
  useEffect(() => {
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
      } else {
        // Initial guest fallback
        const initialGuest: GuestUser = {
          id: 'guest_alex_rivers',
          name: 'Alex Rivers',
          phoneOrEmail: 'alex.rivers@icloud.com',
          isRegistered: true,
          walletBalance: 20000,
          createdAt: new Date().toISOString(),
        };
        setCurrentUser(initialGuest);
        localStorage.setItem(STORAGE_KEY_GUEST_USER, JSON.stringify(initialGuest));
      }

      const savedTx = localStorage.getItem(STORAGE_KEY_WALLET_TX);
      if (savedTx) {
        setWalletTransactions(JSON.parse(savedTx));
      } else {
        const initialTx: WalletTransaction[] = [
          {
            id: 'tx_init_1',
            type: 'topup',
            amount: 25000,
            description: 'Night Club Wallet Top-Up (Paystack Transfer)',
            createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
            reference: 'WAL-TOP-8812',
          },
          {
            id: 'tx_init_2',
            type: 'request_payment',
            amount: 5000,
            description: 'Song Request: Unavailable (feat. Musa Keys)',
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            reference: 'WAL-REQ-9011',
          },
        ];
        setWalletTransactions(initialTx);
        localStorage.setItem(STORAGE_KEY_WALLET_TX, JSON.stringify(initialTx));
      }

      // Rehydrate local audio blobs from persistent IndexedDB
      getAllTracksFromCrateDB().then((idbTracks) => {
        if (idbTracks && idbTracks.length > 0) {
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

      // Attempt to load live production requests from Supabase
      const activeSessionId = 'session-skyline-friday';
      fetchSessionRequestsFromDb(activeSessionId).then((dbReqs) => {
        if (dbReqs && dbReqs.length > 0) {
          setRequests((prev) => {
            const map = new Map<string, SongRequest>();
            // Keep local items, but prioritize DB records
            prev.forEach((r) => map.set(r.id, r));
            dbReqs.forEach((r) => map.set(r.id, r));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        }
      }).catch(() => {});
    } catch {}
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
    const updated = djs.map((d) => {
      if (d.id === currentDj.id && d.liveSession) {
        return {
          ...d,
          liveSession: {
            ...d.liveSession,
            isAcceptingRequests: isAccepting,
          },
        };
      }
      return d;
    });
    saveDjs(updated);
  };

  const updateDjSessionDetails = (details: Partial<NonNullable<DJ['liveSession']>>) => {
    const updated = djs.map((d) => {
      if (d.id === currentDj.id && d.liveSession) {
        return {
          ...d,
          liveSession: {
            ...d.liveSession,
            ...details,
          },
        };
      }
      return d;
    });
    saveDjs(updated);
  };

  const updateDjProfile = (updates: {
    name?: string;
    handle?: string;
    bio?: string;
    genres?: string[];
    basePrice?: number;
    passcode?: string;
  }) => {
    const updated = djs.map((d) => {
      if (d.id === currentDj.id) {
        return {
          ...d,
          name: updates.name !== undefined ? updates.name : d.name,
          handle: updates.handle !== undefined ? updates.handle : d.handle,
          bio: updates.bio !== undefined ? updates.bio : d.bio,
          genres: updates.genres !== undefined ? updates.genres : d.genres,
          liveSession: d.liveSession
            ? {
                ...d.liveSession,
                basePrice: updates.basePrice !== undefined ? updates.basePrice : d.liveSession.basePrice,
                passcode: updates.passcode !== undefined ? updates.passcode : d.liveSession.passcode,
              }
            : d.liveSession,
        };
      }
      return d;
    });
    saveDjs(updated);
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
  }: {
    sessionId: string;
    djId: string;
    song: Song;
    guestName: string;
    guestNote?: string;
    amount: number;
    tip?: number;
    paymentMethod: 'Apple Pay' | 'Credit Card' | 'Cash App' | 'Demo Wallet';
  }): SongRequest => {
    const targetDj = djs.find((d) => d.id === djId) || currentDj;
    const serviceFee = targetDj.liveSession?.serviceFee || 2.0;
    const totalAmount = amount + tip + serviceFee;
    const randomRefNum = Math.floor(1000 + Math.random() * 9000);

    const newRequest: SongRequest = {
      id: `req-${Date.now()}`,
      referenceCode: `CMDJ-${randomRefNum}`,
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
    };

    const next = [newRequest, ...requests];
    saveRequests(next);
    // Broadcast / persist to Supabase Realtime channel
    insertSongRequestToDb(newRequest).catch(() => {});
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
    // Sync status change to Supabase Realtime channel
    updateSongRequestStatusInDb(requestId, newStatus, reason).catch(() => {});
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
    // Sync status change to Supabase Realtime channel
    updateSongRequestStatusInDb(requestId, 'refunded', reason).catch(() => {});
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
  };

  const resetDemoData = () => {
    setRequests([]);
    setDjs(MOCK_DJS);
    setDjLibrary([]);
    try {
      localStorage.removeItem(STORAGE_KEY_REQUESTS);
      localStorage.removeItem(STORAGE_KEY_DJS);
      localStorage.removeItem(STORAGE_KEY_LIBRARY);
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
