import { Song, SongRequest, RequestStatus } from '@/types';
import { getSupabaseClient } from './supabaseClient';

const LOCAL_REQUESTS_KEY = 'cuemydj_requests_prod_v1';
const BROADCAST_CHANNEL_PREFIX = 'cuemydj-session-';

export interface DbSongRequest {
  id: string;
  reference_code: string;
  session_id: string;
  venue_id?: string | null;
  dj_id: string;
  dj_name: string;
  dj_avatar: string | null;
  venue_name: string;
  song: Song;
  guest_name: string;
  guest_note: string | null;
  amount: number;
  service_fee: number;
  total: number;
  currency?: string | null;
  status: string;
  decline_reason: string | null;
  feedback_given: string | null;
  feedback_note?: string | null;
  paid_via: string | null;
  payment_reference: string | null;
  payment_verified?: boolean | null;
  refund_tx_id?: string | null;
  refunded_at?: string | null;
  settled_at?: string | null;
  settlement_id?: string | null;
  created_at: string;
  updated_at: string;
}

type FeedbackValue = SongRequest['feedbackGiven'];
type PaidViaValue = SongRequest['paidVia'];

const VALID_PAID_VIA: ReadonlySet<string> = new Set([
  'Apple Pay',
  'Credit Card',
  'Cash App',
  'Demo Wallet',
  'Paystack',
]);

function normalizePaidVia(val: string | null | undefined): PaidViaValue {
  if (val && VALID_PAID_VIA.has(val)) {
    return val as PaidViaValue;
  }
  return 'Paystack';
}

function normalizeFeedback(val: string | null | undefined): FeedbackValue {
  if (val === 'played_confirmed' || val === 'reported_problem') {
    return val;
  }
  return undefined;
}

export function mapDbToSongRequest(row: DbSongRequest): SongRequest {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    sessionId: row.session_id,
    venueId: row.venue_id || undefined,
    djId: row.dj_id,
    djName: row.dj_name,
    djAvatar: row.dj_avatar || '',
    venueName: row.venue_name,
    song: row.song,
    guestName: row.guest_name,
    guestNote: row.guest_note || undefined,
    amount: Number(row.amount),
    serviceFee: Number(row.service_fee),
    total: Number(row.total),
    currency: row.currency || 'NGN',
    status: row.status as RequestStatus,
    declineReason: row.decline_reason || undefined,
    feedbackGiven: normalizeFeedback(row.feedback_given),
    feedbackNote: row.feedback_note || undefined,
    paidVia: normalizePaidVia(row.paid_via),
    paymentVerifiedServerSide: Boolean(row.payment_verified),
    paymentReference: row.payment_reference || undefined,
    refundTxId: row.refund_tx_id || undefined,
    refundedAt: row.refunded_at || undefined,
    settledAt: row.settled_at || undefined,
    settlementId: row.settlement_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSongRequestToDb(req: SongRequest): Partial<DbSongRequest> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.id);
  return {
    id: isUuid ? req.id : undefined,
    reference_code: req.referenceCode,
    session_id: req.sessionId,
    venue_id: req.venueId || null,
    dj_id: req.djId,
    dj_name: req.djName,
    dj_avatar: req.djAvatar || null,
    venue_name: req.venueName,
    song: req.song,
    guest_name: req.guestName,
    guest_note: req.guestNote || null,
    amount: req.amount,
    service_fee: req.serviceFee,
    total: req.total,
    currency: req.currency || 'NGN',
    status: req.status,
    decline_reason: req.declineReason || null,
    feedback_given: req.feedbackGiven || null,
    feedback_note: req.feedbackNote || null,
    paid_via: req.paidVia,
    payment_reference: req.paymentReference || null,
    payment_verified: Boolean(req.paymentVerifiedServerSide),
  };
}

function readLocalRequests(): SongRequest[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SongRequest[]) : [];
  } catch {
    return [];
  }
}

function writeLocalRequests(requests: SongRequest[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests));
  } catch {
    // Ignore storage quota or private-mode access errors
  }
}

function broadcastLocalRealtimeEvent(
  sessionId: string,
  eventType: 'INSERT' | 'UPDATE',
  request: SongRequest
): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  try {
    const bc = new BroadcastChannel(`${BROADCAST_CHANNEL_PREFIX}${sessionId}`);
    bc.postMessage({ type: eventType, payload: request });
    bc.close();
  } catch {
    // BroadcastChannel unavailable
  }
}

/**
 * Fetch all existing requests for a specific live session.
 * Gracefully falls back to localStorage persistence when Supabase is unconfigured or unreachable.
 */
export async function fetchSessionRequestsFromDb(sessionId: string): Promise<SongRequest[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const local = readLocalRequests().filter((r) => r.sessionId === sessionId);
    return local.length > 0 ? local : null;
  }

  try {
    const { data, error } = await supabase
      .from('song_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch session requests, using local fallback:', error.message);
      const local = readLocalRequests().filter((r) => r.sessionId === sessionId);
      return local.length > 0 ? local : null;
    }

    return (data as DbSongRequest[]).map(mapDbToSongRequest);
  } catch (err) {
    console.warn('[Supabase] Error during fetchSessionRequests, using local fallback:', err);
    const local = readLocalRequests().filter((r) => r.sessionId === sessionId);
    return local.length > 0 ? local : null;
  }
}

/**
 * Insert a newly created request into Supabase (and broadcast locally in fallback mode).
 */
export async function insertSongRequestToDb(request: SongRequest): Promise<boolean> {
  const existing = readLocalRequests();
  const nextLocal = [
    request,
    ...existing.filter((r) => r.id !== request.id && r.referenceCode !== request.referenceCode),
  ];
  writeLocalRequests(nextLocal);

  const supabase = getSupabaseClient();
  if (!supabase) {
    broadcastLocalRealtimeEvent(request.sessionId, 'INSERT', request);
    return true;
  }

  try {
    const dbPayload = mapSongRequestToDb(request);
    const { error } = await supabase
      .from('song_requests')
      .upsert([dbPayload], { onConflict: 'reference_code' });
    if (error) {
      console.warn('[Supabase] Failed to insert request, local persistence retained:', error.message);
      broadcastLocalRealtimeEvent(request.sessionId, 'INSERT', request);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Insert error, local persistence retained:', err);
    broadcastLocalRealtimeEvent(request.sessionId, 'INSERT', request);
    return false;
  }
}

/**
 * Update request status (e.g. accepted, playing, played, declined, refunded) in Supabase or local fallback.
 */
export async function updateSongRequestStatusInDb(
  requestId: string,
  newStatus: RequestStatus,
  reason?: string
): Promise<boolean> {
  const existing = readLocalRequests();
  let updatedLocalItem: SongRequest | null = null;
  const nextLocal = existing.map((r) => {
    if (r.id === requestId || r.referenceCode === requestId) {
      updatedLocalItem = {
        ...r,
        status: newStatus,
        declineReason: reason || r.declineReason,
        updatedAt: new Date().toISOString(),
      };
      return updatedLocalItem;
    }
    return r;
  });
  if (updatedLocalItem) {
    writeLocalRequests(nextLocal);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    if (updatedLocalItem) {
      broadcastLocalRealtimeEvent((updatedLocalItem as SongRequest).sessionId, 'UPDATE', updatedLocalItem);
    }
    return true;
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
    const filter = isUuid ? `id.eq.${requestId},reference_code.eq.${requestId}` : `reference_code.eq.${requestId}`;

    const { error } = await supabase
      .from('song_requests')
      .update({
        status: newStatus,
        decline_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .or(filter);

    if (error) {
      console.warn('[Supabase] Failed to update request status, local persistence retained:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Update status error, local persistence retained:', err);
    return false;
  }
}

/**
 * Subscribes to real-time changes on song_requests table for a given session.
 * Automatically falls back to BroadcastChannel + storage event listener when Supabase is not configured.
 */
export function subscribeToSessionRealtime(
  sessionId: string,
  onInsert: (request: SongRequest) => void,
  onUpdate: (request: SongRequest) => void
): () => void {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Local fallback: subscribe via BroadcastChannel & window storage events for cross-tab live sync
    if (typeof window === 'undefined') return () => {};

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel(`${BROADCAST_CHANNEL_PREFIX}${sessionId}`);
        bc.onmessage = (event: MessageEvent<{ type?: 'INSERT' | 'UPDATE'; payload?: SongRequest }>) => {
          const msg = event.data;
          if (!msg?.payload) return;
          if (msg.type === 'INSERT') onInsert(msg.payload);
          if (msg.type === 'UPDATE') onUpdate(msg.payload);
        };
      }
    } catch {
      bc = null;
    }

    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== LOCAL_REQUESTS_KEY || !ev.newValue) return;
      try {
        const list = JSON.parse(ev.newValue) as SongRequest[];
        if (!Array.isArray(list)) return;
        list
          .filter((r) => r.sessionId === sessionId)
          .forEach((r) => onUpdate(r));
      } catch {
        // Ignore malformed storage payload
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      try {
        bc?.close();
      } catch {}
      window.removeEventListener('storage', onStorage);
    };
  }

  try {
    const channel = supabase
      .channel(`session-${sessionId}-channel`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'song_requests',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          try {
            const mapped = mapDbToSongRequest(payload.new as DbSongRequest);
            onInsert(mapped);
          } catch (e) {
            console.error('[Supabase Realtime] Error processing INSERT payload:', e);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'song_requests',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          try {
            const mapped = mapDbToSongRequest(payload.new as DbSongRequest);
            onUpdate(mapped);
          } catch (e) {
            console.error('[Supabase Realtime] Error processing UPDATE payload:', e);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Realtime] Channel session-${sessionId} status:`, status);
      });

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  } catch (err) {
    console.warn('[Supabase Realtime] Subscription error, falling back cleanly:', err);
    return () => {};
  }
}
