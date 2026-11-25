import { NextRequest, NextResponse } from 'next/server';
import { RequestStatus, Song, SongRequest } from '@/types';
import {
  findSessionMatch,
  findVenueForContext,
  getDjById,
  listSongRequests,
  upsertSongRequest,
} from '@/services/serverDataStore';
import { getSupabaseConfigStatus } from '@/services/supabaseClient';

interface CreateRequestBody {
  id?: string;
  sessionId: string;
  djId?: string;
  venueId?: string;
  song: Song;
  guestName?: string;
  guestNote?: string;
  amount?: number;
  tip?: number;
  paidVia?: SongRequest['paidVia'];
  paymentReference?: string;
  paymentVerifiedServerSide?: boolean;
  status?: RequestStatus;
  currency?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sessionId = searchParams.get('sessionId') || undefined;
    const djId = searchParams.get('djId') || undefined;
    const status = searchParams.get('status') || undefined;
    const referenceCode = searchParams.get('referenceCode') || undefined;

    const requests = await listSongRequests({ sessionId, djId, status, referenceCode });
    return NextResponse.json({
      requests,
      count: requests.length,
    });
  } catch (err) {
    console.error('[Requests API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: CreateRequestBody;
    try {
      body = (await request.json()) as CreateRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const {
      id: suppliedId,
      sessionId,
      djId,
      venueId,
      song,
      guestName,
      guestNote,
      amount,
      tip = 0,
      paidVia = 'Paystack',
      paymentReference,
      paymentVerifiedServerSide = false,
      status = 'waiting',
      currency = 'NGN',
    } = body;

    if (!sessionId || !song || !song.title || !song.artist) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and song (title, artist) are required' },
        { status: 400 }
      );
    }

    const dj = (djId ? await getDjById(djId) : null) || (await findSessionMatch(sessionId));
    if (dj?.liveSession && dj.liveSession.isAcceptingRequests === false) {
      return NextResponse.json(
        { error: 'This DJ booth is not currently accepting song requests' },
        { status: 409 }
      );
    }

    const resolvedSessionId = dj?.liveSession?.id || sessionId;
    const venue = await findVenueForContext({
      venueId,
      venueName: dj?.currentVenue?.name,
      djId: dj?.id,
    });

    const baseAmount =
      typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
        ? amount
        : dj?.liveSession?.basePrice ?? 5000;
    const safeTip = typeof tip === 'number' && Number.isFinite(tip) && tip > 0 ? tip : 0;
    const serviceFee = dj?.liveSession?.serviceFee ?? 500;
    const requestAmount = baseAmount + safeTip;
    const total = requestAmount + serviceFee;

    const referenceCode =
      paymentReference ||
      `CMDJ-${Date.now().toString().slice(-5)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newRequest: SongRequest = {
      id: suppliedId?.trim() || `req-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      referenceCode,
      sessionId: resolvedSessionId,
      venueId: venue?.id,
      djId: dj?.id || djId || 'dj-kofi',
      djName: dj?.name || 'DJ Kofi Beats',
      djAvatar: dj?.avatarUrl || '',
      venueName: venue?.name || dj?.currentVenue?.name || 'Skyline Rooftop Lounge',
      song,
      guestName: guestName?.trim() || 'VIP Guest',
      guestNote: guestNote?.trim() || undefined,
      amount: requestAmount,
      serviceFee,
      total,
      currency,
      status,
      paidVia,
      paymentReference: paymentReference || referenceCode,
      paymentVerifiedServerSide,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await upsertSongRequest(newRequest);
    const supabaseStatus = getSupabaseConfigStatus();

    return NextResponse.json(
      {
        status: 'created',
        request: saved,
        realtime: {
          channel: `session-${resolvedSessionId}-channel`,
          mode: supabaseStatus.mode,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[Requests API] POST error:', err);
    return NextResponse.json({ error: 'Failed to submit song request' }, { status: 500 });
  }
}
