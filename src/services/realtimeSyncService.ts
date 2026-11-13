import { SongRequest, RequestStatus } from '@/types';
import { getSupabaseClient } from './supabaseClient';

export interface DbSongRequest {
  id: string;
  reference_code: string;
  session_id: string;
  dj_id: string;
  dj_name: string;
  dj_avatar: string | null;
  venue_name: string;
  song: any;
  guest_name: string;
  guest_note: string | null;
  amount: number;
  service_fee: number;
  total: number;
  status: string;
  decline_reason: string | null;
  feedback_given: string | null;
  paid_via: string | null;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
}

export function mapDbToSongRequest(row: DbSongRequest): SongRequest {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    sessionId: row.session_id,
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
    status: row.status as RequestStatus,
    declineReason: row.decline_reason || undefined,
    feedbackGiven: (row.feedback_given as any) || undefined,
    paidVia: (row.paid_via as any) || 'Paystack',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSongRequestToDb(req: SongRequest): Partial<DbSongRequest> {
  return {
    id: req.id.includes('-') && req.id.length > 20 ? req.id : undefined,
    reference_code: req.referenceCode,
    session_id: req.sessionId,
    dj_id: req.djId,
    dj_name: req.djName,
    dj_avatar: req.djAvatar,
    venue_name: req.venueName,
    song: req.song,
    guest_name: req.guestName,
    guest_note: req.guestNote || null,
    amount: req.amount,
    service_fee: req.serviceFee,
    total: req.total,
    status: req.status,
    decline_reason: req.declineReason || null,
    feedback_given: req.feedbackGiven || null,
    paid_via: req.paidVia,
  };
}

/**
 * Fetch all existing requests for a specific live session
 */
export async function fetchSessionRequestsFromDb(sessionId: string): Promise<SongRequest[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('song_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch session requests:', error.message);
      return null;
    }

    return (data as DbSongRequest[]).map(mapDbToSongRequest);
  } catch (err) {
    console.warn('[Supabase] Error during fetchSessionRequests:', err);
    return null;
  }
}

/**
 * Insert a newly created request into Supabase
 */
export async function insertSongRequestToDb(request: SongRequest): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const dbPayload = mapSongRequestToDb(request);
    const { error } = await supabase.from('song_requests').insert([dbPayload]);
    if (error) {
      console.warn('[Supabase] Failed to insert request:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Insert error:', err);
    return false;
  }
}

/**
 * Update request status (e.g. accepted, playing, played, declined) in Supabase
 */
export async function updateSongRequestStatusInDb(
  requestId: string,
  newStatus: RequestStatus,
  reason?: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('song_requests')
      .update({
        status: newStatus,
        decline_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${requestId},reference_code.eq.${requestId}`);

    if (error) {
      console.warn('[Supabase] Failed to update request status:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Update status error:', err);
    return false;
  }
}

/**
 * Subscribes to real-time changes on song_requests table for a given session.
 * Automatically receives INSERT and UPDATE events and triggers the callback.
 */
export function subscribeToSessionRealtime(
  sessionId: string,
  onInsert: (request: SongRequest) => void,
  onUpdate: (request: SongRequest) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    // If Supabase is not configured, return a no-op unsubscribe function
    return () => {};
  }

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
    supabase.removeChannel(channel);
  };
}
