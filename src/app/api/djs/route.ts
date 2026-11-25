import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/services/supabaseClient';
import { DJ } from '@/types';

interface DbDjRow {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  genres: string[] | null;
  rating: number | null;
  total_sets: number | null;
  current_venue: {
    name?: string;
    city?: string;
    address?: string;
    distance?: string;
    lat?: number;
    lng?: number;
  } | null;
  live_session: {
    id?: string;
    title?: string;
    venueName?: string;
    eventTitle?: string;
    startTime?: string;
    endTime?: string;
    isAcceptingRequests?: boolean;
    basePrice?: number;
    serviceFee?: number;
    passcode?: string;
    requestRules?: string[];
  } | null;
  active_session_id: string | null;
  is_accepting_requests: boolean | null;
  base_price: number | null;
  service_fee: number | null;
  passcode: string | null;
  paystack_subaccount_code: string | null;
  status: string;
}

function mapDbRowToDj(row: DbDjRow): DJ {
  const venueName = row.current_venue?.name || row.live_session?.venueName || 'Main Club Booth';
  const venueCity = row.current_venue?.city || 'Lagos';
  const venueAddress = row.current_venue?.address || 'Live Venue';
  const sessionId = row.active_session_id || row.live_session?.id || `session-${row.id.slice(0, 8)}`;
  const basePrice = Number(row.base_price ?? row.live_session?.basePrice ?? 5000);
  const serviceFee = Number(row.service_fee ?? row.live_session?.serviceFee ?? 500);
  const isAccepting = row.is_accepting_requests ?? row.live_session?.isAcceptingRequests ?? true;
  const passcode =
    row.passcode ||
    row.live_session?.passcode ||
    row.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();

  return {
    id: row.id,
    name: row.name,
    handle: row.handle.startsWith('@') ? row.handle : `@${row.handle}`,
    avatarUrl:
      row.avatar_url ||
      'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=300&auto=format&fit=crop&q=80',
    bannerUrl:
      row.banner_url ||
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop',
    bio: row.bio || 'Resident DJ taking live song requests on QueMyDJ.',
    genres: Array.isArray(row.genres) && row.genres.length > 0 ? row.genres : ['Afrobeats', 'Amapiano'],
    rating: Number(row.rating ?? 5.0),
    totalSets: Number(row.total_sets ?? 1),
    paystackSubaccountCode: row.paystack_subaccount_code || undefined,
    currentVenue: {
      name: venueName,
      city: venueCity,
      distance: row.current_venue?.distance || 'Live',
      address: venueAddress,
      lat: Number(row.current_venue?.lat ?? 6.4281),
      lng: Number(row.current_venue?.lng ?? 3.4219),
    },
    liveSession: {
      id: sessionId,
      title: row.live_session?.title || row.live_session?.eventTitle || `${row.name} Live`,
      startTime: row.live_session?.startTime || '10:00 PM',
      endTime: row.live_session?.endTime || '04:00 AM',
      isAcceptingRequests: Boolean(isAccepting),
      basePrice,
      serviceFee,
      requestRules: Array.isArray(row.live_session?.requestRules)
        ? row.live_session.requestRules
        : ['Requests are subject to DJ vibe & mixing flow.'],
      passcode,
    },
  };
}

export async function GET() {
  const client = getSupabaseServiceClient();
  if (!client) {
    return NextResponse.json({ djs: [], source: 'local_fallback' });
  }

  try {
    const { data, error } = await client
      .from('djs')
      .select('*')
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ djs: [], source: 'error', error: error.message }, { status: 500 });
    }

    const mapped = (data || []).map((row) => mapDbRowToDj(row as DbDjRow));
    return NextResponse.json({ djs: mapped, source: 'supabase' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch DJs';
    return NextResponse.json({ djs: [], source: 'error', error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const client = getSupabaseServiceClient();
  if (!client) {
    return NextResponse.json({ success: false, mode: 'local_fallback' });
  }

  try {
    const body = await req.json();
    const djId = String(body.id || '').trim();
    if (!djId) {
      return NextResponse.json({ error: 'DJ id is required' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updatePayload.name = body.name.trim();
    if (typeof body.handle === 'string' && body.handle.trim()) {
      updatePayload.handle = body.handle.trim().startsWith('@')
        ? body.handle.trim()
        : `@${body.handle.trim()}`;
    }
    if (typeof body.bio === 'string') updatePayload.bio = body.bio;
    if (Array.isArray(body.genres)) updatePayload.genres = body.genres;
    if (typeof body.isAcceptingRequests === 'boolean') {
      updatePayload.is_accepting_requests = body.isAcceptingRequests;
    }
    if (typeof body.basePrice === 'number' && body.basePrice > 0) {
      updatePayload.base_price = body.basePrice;
    }
    if (typeof body.passcode === 'string' && body.passcode.trim()) {
      updatePayload.passcode = body.passcode.trim().toUpperCase();
    }
    if (body.liveSession && typeof body.liveSession === 'object') {
      updatePayload.live_session = body.liveSession;
    }
    if (body.bankDetails && typeof body.bankDetails === 'object') {
      updatePayload.bank_details = body.bankDetails;
    }
    if (typeof body.paystackRecipientCode === 'string') {
      updatePayload.paystack_recipient_code = body.paystackRecipientCode;
    }

    const { data, error } = await client
      .from('djs')
      .update(updatePayload)
      .eq('id', djId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, dj: mapDbRowToDj(data as DbDjRow) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update DJ';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
