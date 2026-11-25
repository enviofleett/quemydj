import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionMatch,
  listDjs,
  listSongRequests,
  updateDjLiveSession,
} from '@/services/serverDataStore';
import { getSupabaseConfigStatus } from '@/services/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const passcode = searchParams.get('passcode')?.trim().toUpperCase();
    const djId = searchParams.get('djId')?.trim();

    const [djs, allRequests] = await Promise.all([listDjs(), listSongRequests()]);
    const supabaseStatus = getSupabaseConfigStatus();

    const filteredDjs = djs.filter((dj) => {
      if (!dj.liveSession) return false;
      if (activeOnly && !dj.liveSession.isAcceptingRequests) return false;
      if (passcode && dj.liveSession.passcode.toUpperCase() !== passcode) return false;
      if (djId && dj.id !== djId) return false;
      return true;
    });

    const sessions = filteredDjs.map((dj) => {
      const sessionId = dj.liveSession!.id;
      const sessionRequests = allRequests.filter((r) => r.sessionId === sessionId);
      const nowPlaying = sessionRequests.find((r) => r.status === 'playing') || null;
      const waitingCount = sessionRequests.filter(
        (r) => r.status === 'waiting' || r.status === 'new_request'
      ).length;
      const acceptedCount = sessionRequests.filter(
        (r) => r.status === 'accepted' || r.status === 'preparing' || r.status === 'ready_to_play'
      ).length;
      const playedCount = sessionRequests.filter((r) => r.status === 'played').length;

      return {
        sessionId,
        djId: dj.id,
        djName: dj.name,
        djHandle: dj.handle,
        djAvatar: dj.avatarUrl,
        venue: dj.currentVenue,
        liveSession: dj.liveSession,
        stats: {
          waitingCount,
          acceptedCount,
          playedCount,
          totalRequests: sessionRequests.length,
          estimatedWaitMinutes: (waitingCount + acceptedCount) * 4,
        },
        nowPlaying,
        realtime: {
          channel: `session-${sessionId}-channel`,
          mode: supabaseStatus.mode,
        },
      };
    });

    return NextResponse.json({
      sessions,
      count: sessions.length,
      realtimeMode: supabaseStatus.mode,
    });
  } catch (err) {
    console.error('[Sessions API] GET error:', err);
    return NextResponse.json({ error: 'Failed to load live sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      djId?: string;
      isAcceptingRequests?: boolean;
      basePrice?: number;
      serviceFee?: number;
      announcement?: string;
      passcode?: string;
    };

    const targetId = body.sessionId || body.djId;
    if (!targetId) {
      return NextResponse.json(
        { error: 'sessionId or djId is required' },
        { status: 400 }
      );
    }

    const match = await findSessionMatch(targetId);
    if (!match) {
      return NextResponse.json({ error: 'Session or DJ not found' }, { status: 404 });
    }

    const updated = await updateDjLiveSession(match.liveSession?.id || match.id, {
      ...(body.isAcceptingRequests !== undefined && {
        isAcceptingRequests: body.isAcceptingRequests,
      }),
      ...(typeof body.basePrice === 'number' && body.basePrice >= 0 && {
        basePrice: body.basePrice,
      }),
      ...(typeof body.serviceFee === 'number' && body.serviceFee >= 0 && {
        serviceFee: body.serviceFee,
      }),
      ...(body.announcement !== undefined && { announcement: body.announcement }),
      ...(body.passcode !== undefined && { passcode: body.passcode }),
    });

    return NextResponse.json({
      status: 'updated',
      dj: updated,
      liveSession: updated?.liveSession,
    });
  } catch (err) {
    console.error('[Sessions API] POST error:', err);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
