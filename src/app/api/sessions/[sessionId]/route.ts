import { NextRequest, NextResponse } from 'next/server';
import {
  findSessionMatch,
  listSongRequests,
  updateDjLiveSession,
} from '@/services/serverDataStore';
import { getSupabaseConfigStatus } from '@/services/supabaseClient';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const dj = await findSessionMatch(sessionId);

    if (!dj || !dj.liveSession) {
      return NextResponse.json({ error: 'Live session not found' }, { status: 404 });
    }

    const activeSessionId = dj.liveSession.id;
    const requests = await listSongRequests({ sessionId: activeSessionId });
    const supabaseStatus = getSupabaseConfigStatus();

    const nowPlaying = requests.find((r) => r.status === 'playing') || null;
    const queue = requests.filter(
      (r) =>
        r.status === 'waiting' ||
        r.status === 'new_request' ||
        r.status === 'accepted' ||
        r.status === 'preparing' ||
        r.status === 'ready_to_play'
    );

    return NextResponse.json({
      sessionId: activeSessionId,
      isAcceptingRequests: dj.liveSession.isAcceptingRequests,
      dj: {
        id: dj.id,
        name: dj.name,
        handle: dj.handle,
        avatarUrl: dj.avatarUrl,
        genres: dj.genres,
        rating: dj.rating,
      },
      venue: dj.currentVenue,
      liveSession: dj.liveSession,
      nowPlaying,
      stats: {
        queueLength: queue.length,
        waitingCount: requests.filter((r) => r.status === 'waiting').length,
        acceptedCount: requests.filter((r) => r.status === 'accepted').length,
        playedCount: requests.filter((r) => r.status === 'played').length,
        estimatedWaitMinutes: queue.length * 4,
      },
      requests,
      realtime: {
        channel: `session-${activeSessionId}-channel`,
        mode: supabaseStatus.mode,
      },
    });
  } catch (err) {
    console.error('[Session Detail API] GET error:', err);
    return NextResponse.json({ error: 'Failed to load live session status' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await context.params;
    const body = (await request.json()) as {
      isAcceptingRequests?: boolean;
      basePrice?: number;
      serviceFee?: number;
      announcement?: string;
      minimumVibeBPM?: number;
      passcode?: string;
    };

    const existing = await findSessionMatch(sessionId);
    if (!existing) {
      return NextResponse.json({ error: 'Live session not found' }, { status: 404 });
    }

    const updated = await updateDjLiveSession(existing.liveSession?.id || sessionId, body);
    return NextResponse.json({
      status: 'updated',
      sessionId: updated?.liveSession?.id || sessionId,
      liveSession: updated?.liveSession,
    });
  } catch (err) {
    console.error('[Session Detail API] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update live session' }, { status: 500 });
  }
}
