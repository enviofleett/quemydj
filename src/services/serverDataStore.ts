import { MOCK_DJS, INITIAL_REQUESTS } from '@/data/mockData';
import { INITIAL_VENUES, INITIAL_DISPUTES } from '@/data/mockAdminData';
import {
  ClubVenue,
  DisputeRecord,
  DJ,
  RequestStatus,
  Song,
  SongRequest,
  VenueCommissionSplit,
  WalletTransaction,
} from '@/types';
import { getSupabaseServiceClient } from './supabaseClient';
import { DbSongRequest, mapDbToSongRequest, mapSongRequestToDb } from './realtimeSyncService';

export interface PaymentIntentRecord {
  reference: string;
  email: string;
  amount: number;
  amountKobo: number;
  tip?: number;
  currency: string;
  sessionId: string;
  djId: string;
  venueId?: string;
  guestName: string;
  guestNote?: string;
  song?: Song;
  type: 'song_request' | 'wallet_topup';
  mode: 'live' | 'test' | 'simulation';
  status: 'initialized' | 'verified' | 'failed';
  splitRule: VenueCommissionSplit;
  metadata?: Record<string, unknown>;
  createdAt: string;
  verifiedAt?: string;
}

interface ServerStoreState {
  djs: DJ[];
  venues: ClubVenue[];
  disputes: DisputeRecord[];
  requests: SongRequest[];
  walletTransactions: WalletTransaction[];
  paymentIntents: Record<string, PaymentIntentRecord>;
  processedReferences: Record<string, { processedAt: string; source: string; payload?: unknown }>;
  settledRequests: Record<string, { settlementId: string; settledAt: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function buildReferenceOrFilter(idOrRef: string): string {
  const escaped = `"${idOrRef.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  return UUID_REGEX.test(idOrRef)
    ? `id.eq.${idOrRef},reference_code.eq.${escaped},payment_reference.eq.${escaped}`
    : `reference_code.eq.${escaped},payment_reference.eq.${escaped}`;
}

function cloneInitialState(): ServerStoreState {
  return {
    djs: structuredClone(MOCK_DJS),
    venues: structuredClone(INITIAL_VENUES),
    disputes: structuredClone(INITIAL_DISPUTES),
    requests: structuredClone(INITIAL_REQUESTS),
    walletTransactions: [],
    paymentIntents: {},
    processedReferences: {},
    settledRequests: {},
  };
}

declare global {
  var __quemydjServerStore: ServerStoreState | undefined;
}

function getLocalStore(): ServerStoreState {
  if (!globalThis.__quemydjServerStore) {
    globalThis.__quemydjServerStore = cloneInitialState();
  }
  return globalThis.__quemydjServerStore;
}

export function resetServerDataStore(): void {
  globalThis.__quemydjServerStore = cloneInitialState();
}

// =========================================================================
// DJs & Live Sessions
// =========================================================================
export async function listDjs(): Promise<DJ[]> {
  const local = getLocalStore();
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('djs').select('*').order('name');
      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          handle: row.handle,
          avatarUrl: row.avatar_url || '',
          bannerUrl: row.banner_url || '',
          bio: row.bio || '',
          genres: Array.isArray(row.genres) ? row.genres : [],
          rating: Number(row.rating ?? 5),
          totalSets: Number(row.total_sets ?? 0),
          instagram: row.instagram || undefined,
          paystackSubaccountCode: row.paystack_subaccount_code || undefined,
          paystackRecipientCode: row.paystack_recipient_code || undefined,
          currentVenue: row.current_venue || {
            name: 'Live Venue',
            city: '',
            distance: '',
            address: '',
            lat: 0,
            lng: 0,
          },
          liveSession: row.live_session || undefined,
        }));
      }
    } catch (err) {
      console.warn('[ServerStore] listDjs Supabase fallback:', err);
    }
  }
  return local.djs;
}

export async function getDjById(djId: string): Promise<DJ | null> {
  const all = await listDjs();
  return all.find((d) => d.id === djId) || null;
}

export async function findSessionMatch(sessionIdOrCode: string): Promise<DJ | null> {
  const all = await listDjs();
  const target = sessionIdOrCode.trim();
  const upper = target.toUpperCase();
  return (
    all.find(
      (d) =>
        d.liveSession?.id === target ||
        d.liveSession?.passcode.toUpperCase() === upper ||
        d.id === target
    ) || null
  );
}

export async function updateDjLiveSession(
  sessionId: string,
  updates: Partial<NonNullable<DJ['liveSession']>>
): Promise<DJ | null> {
  const local = getLocalStore();
  const idx = local.djs.findIndex((d) => d.liveSession?.id === sessionId || d.id === sessionId);
  if (idx === -1) return null;

  const target = local.djs[idx];
  const updatedDj: DJ = {
    ...target,
    liveSession: target.liveSession
      ? { ...target.liveSession, ...updates }
      : {
          id: sessionId,
          title: updates.title || 'Live Booth Session',
          startTime: updates.startTime || '10:00 PM',
          endTime: updates.endTime || '03:00 AM',
          isAcceptingRequests: updates.isAcceptingRequests ?? true,
          basePrice: updates.basePrice ?? 5000,
          serviceFee: updates.serviceFee ?? 500,
          requestRules: updates.requestRules || [],
          passcode: updates.passcode || 'LIVE',
          announcement: updates.announcement,
        },
  };
  local.djs[idx] = updatedDj;

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase
        .from('djs')
        .update({
          live_session: updatedDj.liveSession,
          is_accepting_requests: updatedDj.liveSession?.isAcceptingRequests ?? true,
          base_price: updatedDj.liveSession?.basePrice ?? 5000,
          service_fee: updatedDj.liveSession?.serviceFee ?? 500,
          passcode: updatedDj.liveSession?.passcode ?? null,
        })
        .eq('id', updatedDj.id);
    } catch (err) {
      console.warn('[ServerStore] updateDjLiveSession Supabase sync skipped:', err);
    }
  }

  return updatedDj;
}

// =========================================================================
// Song Requests
// =========================================================================
export async function listSongRequests(filters?: {
  sessionId?: string;
  djId?: string;
  status?: string;
  referenceCode?: string;
}): Promise<SongRequest[]> {
  const local = getLocalStore();
  let items: SongRequest[] = [...local.requests];

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      let query = supabase
        .from('song_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.sessionId) query = query.eq('session_id', filters.sessionId);
      if (filters?.djId) query = query.eq('dj_id', filters.djId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.referenceCode) {
        const escapedRef = `"${filters.referenceCode.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        query = query.or(`reference_code.eq.${escapedRef},payment_reference.eq.${escapedRef}`);
      }

      const { data, error } = await query;
      if (!error && data) {
        items = (data as DbSongRequest[]).map(mapDbToSongRequest);
        return items;
      }
    } catch (err) {
      console.warn('[ServerStore] listSongRequests Supabase fallback:', err);
    }
  }

  return items.filter((req) => {
    if (filters?.sessionId && req.sessionId !== filters.sessionId) return false;
    if (filters?.djId && req.djId !== filters.djId) return false;
    if (filters?.status && req.status !== filters.status) return false;
    if (
      filters?.referenceCode &&
      req.referenceCode !== filters.referenceCode &&
      req.paymentReference !== filters.referenceCode
    ) {
      return false;
    }
    return true;
  });
}

export async function getSongRequestByIdOrRef(idOrRef: string): Promise<SongRequest | null> {
  const local = getLocalStore();
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      const filter = buildReferenceOrFilter(idOrRef);
      const { data, error } = await supabase.from('song_requests').select('*').or(filter).limit(1);
      if (!error && data && data.length > 0) {
        return mapDbToSongRequest(data[0] as DbSongRequest);
      }
    } catch (err) {
      console.warn('[ServerStore] getSongRequestByIdOrRef Supabase fallback:', err);
    }
  }

  return (
    local.requests.find(
      (r) => r.id === idOrRef || r.referenceCode === idOrRef || r.paymentReference === idOrRef
    ) || null
  );
}

export async function upsertSongRequest(req: SongRequest): Promise<SongRequest> {
  const isUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
  const normalizedReq: SongRequest = {
    ...req,
    id: isUuid(req.id) ? req.id : crypto.randomUUID(),
  };

  const local = getLocalStore();
  const existingIdx = local.requests.findIndex(
    (r) => r.id === normalizedReq.id || r.referenceCode === normalizedReq.referenceCode
  );
  if (existingIdx >= 0) {
    local.requests[existingIdx] = { ...local.requests[existingIdx], ...normalizedReq };
  } else {
    local.requests.unshift(normalizedReq);
  }

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      const payload = mapSongRequestToDb(normalizedReq);
      const { data, error } = await supabase
        .from('song_requests')
        .upsert([payload], { onConflict: 'reference_code' })
        .select('*')
        .single();
      if (!error && data) {
        return mapDbToSongRequest(data as DbSongRequest);
      }
    } catch (err) {
      console.warn('[ServerStore] upsertSongRequest Supabase fallback:', err);
    }
  }

  return existingIdx >= 0 ? local.requests[existingIdx] : normalizedReq;
}

export async function updateSongRequest(
  idOrRef: string,
  updates: Partial<{
    status: RequestStatus;
    declineReason: string;
    feedbackGiven: 'played_confirmed' | 'reported_problem';
    feedbackNote: string;
    refundTxId: string;
    refundedAt: string;
    settledAt: string;
    settlementId: string;
    paymentVerifiedServerSide: boolean;
  }>
): Promise<SongRequest | null> {
  const local = getLocalStore();
  const now = new Date().toISOString();
  let updatedLocal: SongRequest | null = null;

  local.requests = local.requests.map((r) => {
    if (r.id === idOrRef || r.referenceCode === idOrRef || r.paymentReference === idOrRef) {
      updatedLocal = {
        ...r,
        ...updates,
        updatedAt: now,
      };
      return updatedLocal;
    }
    return r;
  });

  if (updates.settledAt && updates.settlementId && updatedLocal) {
    local.settledRequests[(updatedLocal as SongRequest).id] = {
      settledAt: updates.settledAt,
      settlementId: updates.settlementId,
    };
  }

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      const dbUpdate: Record<string, unknown> = { updated_at: now };
      if (updates.status !== undefined) dbUpdate.status = updates.status;
      if (updates.declineReason !== undefined) dbUpdate.decline_reason = updates.declineReason;
      if (updates.feedbackGiven !== undefined) dbUpdate.feedback_given = updates.feedbackGiven;
      if (updates.feedbackNote !== undefined) dbUpdate.feedback_note = updates.feedbackNote;
      if (updates.refundTxId !== undefined) dbUpdate.refund_tx_id = updates.refundTxId;
      if (updates.refundedAt !== undefined) dbUpdate.refunded_at = updates.refundedAt;
      if (updates.settledAt !== undefined) dbUpdate.settled_at = updates.settledAt;
      if (updates.settlementId !== undefined) dbUpdate.settlement_id = updates.settlementId;
      if (updates.paymentVerifiedServerSide !== undefined) {
        dbUpdate.payment_verified = updates.paymentVerifiedServerSide;
      }

      const filter = buildReferenceOrFilter(idOrRef);

      const { data, error } = await supabase
        .from('song_requests')
        .update(dbUpdate)
        .or(filter)
        .select('*');

      if (!error && data && data.length > 0) {
        return mapDbToSongRequest(data[0] as DbSongRequest);
      }
    } catch (err) {
      console.warn('[ServerStore] updateSongRequest Supabase fallback:', err);
    }
  }

  return updatedLocal;
}

// =========================================================================
// Venues & Commission Splits
// =========================================================================
export async function listVenues(): Promise<ClubVenue[]> {
  const local = getLocalStore();
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      const { data: venueRows, error } = await supabase.from('venues').select('*').order('name');
      if (!error && venueRows && venueRows.length > 0) {
        const { data: splitRows } = await supabase.from('venue_commission_splits').select('*');
        const splitMap = new Map<string, VenueCommissionSplit>();
        (splitRows || []).forEach((s) => {
          splitMap.set(s.venue_id, {
            venuePercentage: Number(s.venue_percentage),
            djPercentage: Number(s.dj_percentage),
            platformPercentage: Number(s.platform_percentage),
          });
        });

        return venueRows.map((v) => ({
          id: v.id,
          name: v.name,
          slug: v.slug,
          address: v.address,
          city: v.city,
          coverImage: v.cover_image || '',
          ownerName: v.owner_name,
          ownerEmail: v.owner_email,
          ownerPhone: v.owner_phone || '',
          bankDetails: v.bank_details || { bankName: '', accountNumber: '', accountName: '' },
          commissionSplit: splitMap.get(v.id) || {
            venuePercentage: 20,
            djPercentage: 70,
            platformPercentage: 10,
          },
          activeDjId: v.active_dj_id || undefined,
          status: v.status,
          rating: Number(v.rating ?? 4.8),
          totalRevenueGenerated: Number(v.total_revenue_generated ?? 0),
          totalCommissionPaid: Number(v.total_commission_paid ?? 0),
          paystackSubaccountCode: v.paystack_subaccount_code || undefined,
          paystackSplitCode: v.paystack_split_code || undefined,
          paystackRecipientCode: v.paystack_recipient_code || undefined,
          lastSettledAt: v.last_settled_at || undefined,
        }));
      }
    } catch (err) {
      console.warn('[ServerStore] listVenues Supabase fallback:', err);
    }
  }
  return local.venues;
}

export async function findVenueForContext(params: {
  venueId?: string;
  venueName?: string;
  djId?: string;
}): Promise<ClubVenue | null> {
  const all = await listVenues();
  if (params.venueId) {
    const byId = all.find((v) => v.id === params.venueId || v.slug === params.venueId);
    if (byId) return byId;
  }
  if (params.venueName) {
    const needle = params.venueName.toLowerCase();
    const byName = all.find((v) => v.name.toLowerCase().includes(needle));
    if (byName) return byName;
  }
  if (params.djId) {
    const byDj = all.find((v) => v.activeDjId === params.djId);
    if (byDj) return byDj;
  }
  return null;
}

export async function createVenueRecord(
  input: Omit<ClubVenue, 'id' | 'totalRevenueGenerated' | 'totalCommissionPaid'>
): Promise<ClubVenue> {
  const local = getLocalStore();
  const venue: ClubVenue = {
    ...input,
    id: `venue-${Date.now()}`,
    totalRevenueGenerated: 0,
    totalCommissionPaid: 0,
  };
  local.venues.unshift(venue);

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase.from('venues').insert([
        {
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          address: venue.address,
          city: venue.city,
          cover_image: venue.coverImage,
          owner_name: venue.ownerName,
          owner_email: venue.ownerEmail,
          owner_phone: venue.ownerPhone,
          bank_details: venue.bankDetails,
          active_dj_id: venue.activeDjId || null,
          status: venue.status,
          rating: venue.rating,
          paystack_subaccount_code: venue.paystackSubaccountCode || null,
          paystack_split_code: venue.paystackSplitCode || null,
          paystack_recipient_code: venue.paystackRecipientCode || null,
        },
      ]);
      await supabase.from('venue_commission_splits').upsert(
        [
          {
            venue_id: venue.id,
            venue_percentage: venue.commissionSplit.venuePercentage,
            dj_percentage: venue.commissionSplit.djPercentage,
            platform_percentage: venue.commissionSplit.platformPercentage,
          },
        ],
        { onConflict: 'venue_id' }
      );
    } catch (err) {
      console.warn('[ServerStore] createVenueRecord Supabase fallback:', err);
    }
  }

  return venue;
}

export async function updateVenueCommissionSplit(
  venueId: string,
  split: VenueCommissionSplit,
  updatedBy = 'super_admin'
): Promise<ClubVenue | null> {
  const local = getLocalStore();
  const idx = local.venues.findIndex((v) => v.id === venueId || v.slug === venueId);
  if (idx === -1) return null;

  const updatedVenue: ClubVenue = {
    ...local.venues[idx],
    commissionSplit: { ...split },
  };
  local.venues[idx] = updatedVenue;

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase.from('venue_commission_splits').upsert(
        [
          {
            venue_id: updatedVenue.id,
            venue_percentage: split.venuePercentage,
            dj_percentage: split.djPercentage,
            platform_percentage: split.platformPercentage,
            updated_by: updatedBy,
          },
        ],
        { onConflict: 'venue_id' }
      );
    } catch (err) {
      console.warn('[ServerStore] updateVenueCommissionSplit Supabase fallback:', err);
    }
  }

  return updatedVenue;
}

export async function recordVenueSettlementTotals(
  venueId: string,
  grossAdded: number,
  commissionAdded: number,
  settledAt: string
): Promise<ClubVenue | null> {
  const local = getLocalStore();
  const idx = local.venues.findIndex((v) => v.id === venueId);
  if (idx === -1) return null;

  const existing = local.venues[idx];
  const updated: ClubVenue = {
    ...existing,
    totalRevenueGenerated: existing.totalRevenueGenerated + grossAdded,
    totalCommissionPaid: existing.totalCommissionPaid + commissionAdded,
    lastSettledAt: settledAt,
  };
  local.venues[idx] = updated;

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase
        .from('venues')
        .update({
          total_revenue_generated: updated.totalRevenueGenerated,
          total_commission_paid: updated.totalCommissionPaid,
          last_settled_at: settledAt,
        })
        .eq('id', venueId);
    } catch (err) {
      console.warn('[ServerStore] recordVenueSettlementTotals Supabase fallback:', err);
    }
  }

  return updated;
}

// =========================================================================
// Disputes
// =========================================================================
export async function listDisputes(statusFilter?: string): Promise<DisputeRecord[]> {
  const local = getLocalStore();
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      let query = supabase.from('disputes').select('*').order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          requestId: d.request_id,
          referenceCode: d.reference_code,
          venueId: d.venue_id || undefined,
          djId: d.dj_id || undefined,
          guestName: d.guest_name,
          djName: d.dj_name,
          venueName: d.venue_name,
          songTitle: d.song_title,
          amount: Number(d.amount),
          reason: d.reason,
          status: d.status,
          createdAt: d.created_at,
          resolvedAt: d.resolved_at || undefined,
          resolutionNote: d.resolution_note || undefined,
          resolvedBy: d.resolved_by || undefined,
          refundReference: d.refund_reference || undefined,
        }));
      }
    } catch (err) {
      console.warn('[ServerStore] listDisputes Supabase fallback:', err);
    }
  }

  return statusFilter
    ? local.disputes.filter((d) => d.status === statusFilter)
    : local.disputes;
}

export async function getDisputeById(disputeId: string): Promise<DisputeRecord | null> {
  const all = await listDisputes();
  return all.find((d) => d.id === disputeId) || null;
}

export async function createDisputeRecord(
  input: Omit<DisputeRecord, 'id' | 'status' | 'createdAt'>
): Promise<DisputeRecord> {
  const local = getLocalStore();
  const record: DisputeRecord = {
    ...input,
    id: `disp-${Date.now()}`,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  local.disputes.unshift(record);

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase.from('disputes').insert([
        {
          id: record.id,
          request_id: record.requestId,
          reference_code: record.referenceCode,
          venue_id: record.venueId || null,
          dj_id: record.djId || null,
          guest_name: record.guestName,
          dj_name: record.djName,
          venue_name: record.venueName,
          song_title: record.songTitle,
          amount: record.amount,
          reason: record.reason,
          status: record.status,
        },
      ]);
    } catch (err) {
      console.warn('[ServerStore] createDisputeRecord Supabase fallback:', err);
    }
  }

  return record;
}

export async function updateDisputeRecord(
  disputeId: string,
  updates: Partial<DisputeRecord>
): Promise<DisputeRecord | null> {
  const local = getLocalStore();
  let updated: DisputeRecord | null = null;
  local.disputes = local.disputes.map((d) => {
    if (d.id === disputeId) {
      updated = { ...d, ...updates };
      return updated;
    }
    return d;
  });

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .update({
          status: updates.status,
          resolution_note: updates.resolutionNote || null,
          resolved_at: updates.resolvedAt || null,
          resolved_by: updates.resolvedBy || null,
          refund_reference: updates.refundReference || null,
        })
        .eq('id', disputeId)
        .select('*')
        .single();

      if (!error && data) {
        return {
          id: data.id,
          requestId: data.request_id,
          referenceCode: data.reference_code,
          venueId: data.venue_id || undefined,
          djId: data.dj_id || undefined,
          guestName: data.guest_name,
          djName: data.dj_name,
          venueName: data.venue_name,
          songTitle: data.song_title,
          amount: Number(data.amount),
          reason: data.reason,
          status: data.status,
          createdAt: data.created_at,
          resolvedAt: data.resolved_at || undefined,
          resolutionNote: data.resolution_note || undefined,
          resolvedBy: data.resolved_by || undefined,
          refundReference: data.refund_reference || undefined,
        };
      }
    } catch (err) {
      console.warn('[ServerStore] updateDisputeRecord Supabase fallback:', err);
    }
  }

  return updated;
}

// =========================================================================
// Wallet Transactions, Payment Intents & Idempotency
// =========================================================================
export async function recordWalletTransaction(
  tx: Omit<WalletTransaction, 'id' | 'createdAt'> & {
    id?: string;
    createdAt?: string;
    idempotencyKey?: string;
    userId?: string;
    provider?: string;
    providerReference?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<WalletTransaction> {
  const local = getLocalStore();
  if (tx.idempotencyKey) {
    const existing = local.walletTransactions.find(
      (item) => (item as WalletTransaction & { idempotencyKey?: string }).idempotencyKey === tx.idempotencyKey
    );
    if (existing) return existing;
  }

  const record: WalletTransaction & { idempotencyKey?: string } = {
    id: tx.id || `tx-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    createdAt: tx.createdAt || new Date().toISOString(),
    reference: tx.reference,
    direction: tx.direction || 'credit',
    status: tx.status || 'completed',
    venueId: tx.venueId,
    djId: tx.djId,
    requestId: tx.requestId,
    idempotencyKey: tx.idempotencyKey,
  };
  local.walletTransactions.unshift(record);

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      await supabase.from('wallet_transactions').upsert(
        [
          {
            id: record.id,
            reference: record.reference,
            idempotency_key: tx.idempotencyKey || null,
            user_id: tx.userId || null,
            venue_id: record.venueId || null,
            dj_id: record.djId || null,
            request_id: record.requestId || null,
            type: record.type,
            direction: record.direction || 'credit',
            amount: record.amount,
            status: record.status || 'completed',
            provider: tx.provider || 'paystack',
            provider_reference: tx.providerReference || record.reference,
            description: record.description,
            metadata: tx.metadata || {},
          },
        ],
        { onConflict: 'idempotency_key' }
      );
    } catch (err) {
      console.warn('[ServerStore] recordWalletTransaction Supabase fallback:', err);
    }
  }

  return record;
}

export async function listWalletTransactions(filters?: {
  venueId?: string;
  djId?: string;
  type?: string;
}): Promise<WalletTransaction[]> {
  const local = getLocalStore();
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      if (filters?.venueId) query = query.eq('venue_id', filters.venueId);
      if (filters?.djId) query = query.eq('dj_id', filters.djId);
      if (filters?.type) query = query.eq('type', filters.type);
      const { data, error } = await query;
      if (!error && data) {
        return data.map((row) => ({
          id: row.id,
          type: row.type,
          amount: Number(row.amount),
          description: row.description,
          createdAt: row.created_at,
          reference: row.reference,
          direction: row.direction,
          status: row.status,
          venueId: row.venue_id || undefined,
          djId: row.dj_id || undefined,
          requestId: row.request_id || undefined,
        }));
      }
    } catch (err) {
      console.warn('[ServerStore] listWalletTransactions Supabase fallback:', err);
    }
  }

  return local.walletTransactions.filter((t) => {
    if (filters?.venueId && t.venueId !== filters.venueId) return false;
    if (filters?.djId && t.djId !== filters.djId) return false;
    if (filters?.type && t.type !== filters.type) return false;
    return true;
  });
}

export function savePaymentIntent(intent: PaymentIntentRecord): void {
  const local = getLocalStore();
  local.paymentIntents[intent.reference] = intent;
}

export function getPaymentIntent(reference: string): PaymentIntentRecord | null {
  const local = getLocalStore();
  return local.paymentIntents[reference] || null;
}

export async function hasProcessedPaymentReference(reference: string): Promise<boolean> {
  const local = getLocalStore();
  if (local.processedReferences[reference]) return true;

  const supabase = getSupabaseServiceClient();
  if (supabase) {
    try {
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('idempotency_key', `paystack-confirm:${reference}`)
        .limit(1);
      if (txData && txData.length > 0) {
        local.processedReferences[reference] = {
          processedAt: new Date().toISOString(),
          source: 'supabase_ledger',
        };
        return true;
      }

      const { data: reqData } = await supabase
        .from('song_requests')
        .select('id, payment_verified')
        .eq('payment_reference', reference)
        .eq('payment_verified', true)
        .limit(1);
      if (reqData && reqData.length > 0) {
        local.processedReferences[reference] = {
          processedAt: new Date().toISOString(),
          source: 'supabase_request',
        };
        return true;
      }
    } catch (err) {
      console.warn('[ServerStore] hasProcessedPaymentReference check fallback:', err);
    }
  }

  return false;
}

export function markPaymentReferenceProcessed(
  reference: string,
  source: string,
  payload?: unknown
): void {
  const local = getLocalStore();
  local.processedReferences[reference] = {
    processedAt: new Date().toISOString(),
    source,
    payload,
  };
  if (local.paymentIntents[reference]) {
    local.paymentIntents[reference] = {
      ...local.paymentIntents[reference],
      status: 'verified',
      verifiedAt: new Date().toISOString(),
    };
  }
}
