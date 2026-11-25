import { NextRequest, NextResponse } from 'next/server';
import { RequestStatus } from '@/types';
import {
  createDisputeRecord,
  getSongRequestByIdOrRef,
  listDisputes,
  updateSongRequest,
} from '@/services/serverDataStore';

const VALID_STATUSES: ReadonlySet<RequestStatus> = new Set([
  'awaiting_payment',
  'payment_confirmed',
  'new_request',
  'accepted',
  'preparing',
  'ready_to_play',
  'playing',
  'played',
  'declined',
  'unavailable',
  'refund_pending',
  'refunded',
  'waiting',
]);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await context.params;
    const item = await getSongRequestByIdOrRef(requestId);
    if (!item) {
      return NextResponse.json({ error: 'Song request not found' }, { status: 404 });
    }
    return NextResponse.json({ request: item });
  } catch (err) {
    console.error('[Request Detail API] GET error:', err);
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await context.params;
    const body = (await request.json()) as {
      status?: RequestStatus;
      declineReason?: string;
      feedbackGiven?: 'played_confirmed' | 'reported_problem';
      feedbackNote?: string;
    };

    const existing = await getSongRequestByIdOrRef(requestId);
    if (!existing) {
      return NextResponse.json({ error: 'Song request not found' }, { status: 404 });
    }

    if (body.status && !VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: `Invalid request status: ${body.status}` }, { status: 400 });
    }

    const updates: Parameters<typeof updateSongRequest>[1] = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.declineReason !== undefined) updates.declineReason = body.declineReason;
    if (body.feedbackGiven !== undefined) updates.feedbackGiven = body.feedbackGiven;
    if (body.feedbackNote !== undefined) updates.feedbackNote = body.feedbackNote;

    if (body.status === 'refunded') {
      updates.refundTxId = `ref-${Date.now().toString(36)}`;
      updates.refundedAt = new Date().toISOString();
    }

    const updated = await updateSongRequest(requestId, updates);

    // Auto-open dispute record when guest reports a playback problem
    let createdDispute = null;
    if (body.feedbackGiven === 'reported_problem') {
      const existingDisputes = await listDisputes();
      const alreadyFiled = existingDisputes.some(
        (d) => d.requestId === existing.id || d.referenceCode === existing.referenceCode
      );
      if (!alreadyFiled) {
        createdDispute = await createDisputeRecord({
          requestId: existing.id,
          referenceCode: existing.referenceCode,
          venueId: existing.venueId,
          djId: existing.djId,
          guestName: existing.guestName,
          djName: existing.djName,
          venueName: existing.venueName,
          songTitle: `${existing.song.title} (${existing.song.artist})`,
          amount: existing.total,
          reason: body.feedbackNote?.trim() || 'Guest reported playback issue.',
        });
      }
    }

    return NextResponse.json({
      status: 'updated',
      request: updated,
      ...(createdDispute ? { dispute: createdDispute } : {}),
    });
  } catch (err) {
    console.error('[Request Detail API] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update song request' }, { status: 500 });
  }
}
