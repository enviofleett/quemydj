import { NextRequest, NextResponse } from 'next/server';
import { DisputeAction, resolveDisputeUseCase } from '@/services/disputeService';
import {
  createDisputeRecord,
  listDisputes,
  listSongRequests,
  listVenues,
} from '@/services/serverDataStore';

export async function GET(request: NextRequest) {
  try {
    const statusFilter = request.nextUrl.searchParams.get('status')?.trim() || undefined;
    const [disputes, venues, requests] = await Promise.all([
      listDisputes(statusFilter),
      listVenues(),
      listSongRequests(),
    ]);

    const openDisputes = disputes.filter((d) => d.status === 'open');
    const totalEscrowHeld = openDisputes.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const totalPlatformGross =
      requests.reduce((sum, r) => sum + Number(r.total || 0), 0) +
      venues.reduce((sum, v) => sum + Number(v.totalRevenueGenerated || 0), 0);

    return NextResponse.json({
      disputes,
      count: disputes.length,
      summary: {
        openCount: openDisputes.length,
        refundedCount: disputes.filter((d) => d.status === 'refunded').length,
        resolvedToDjCount: disputes.filter((d) => d.status === 'resolved_to_dj').length,
        totalEscrowHeld,
        totalPlatformGross,
      },
    });
  } catch (err) {
    console.error('[Admin Disputes API] GET error:', err);
    return NextResponse.json({ error: 'Failed to load disputes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      // For direct resolution via POST /api/admin/disputes
      disputeId?: string;
      action?: DisputeAction;
      resolutionNote?: string;
      resolvedBy?: string;
      // For creating a new dispute
      requestId?: string;
      referenceCode?: string;
      venueId?: string;
      djId?: string;
      guestName?: string;
      djName?: string;
      venueName?: string;
      songTitle?: string;
      amount?: number;
      reason?: string;
    };

    // Branch 1: Arbitrate an existing dispute
    if (body.disputeId && body.action) {
      const outcome = await resolveDisputeUseCase({
        disputeId: body.disputeId,
        action: body.action,
        resolutionNote: body.resolutionNote,
        resolvedBy: body.resolvedBy,
      });

      if (outcome.error) {
        return NextResponse.json({ error: outcome.error }, { status: outcome.httpStatus });
      }

      return NextResponse.json(
        {
          status: 'resolved',
          idempotent: Boolean(outcome.idempotent),
          dispute: outcome.dispute,
          splitBreakdown: outcome.splitBreakdown,
          refundResult: outcome.refundResult,
        },
        { status: outcome.httpStatus }
      );
    }

    // Branch 2: Create a new dispute record
    if (!body.requestId || !body.reason || typeof body.amount !== 'number' || body.amount < 0) {
      return NextResponse.json(
        { error: 'Missing required fields: requestId, amount, and reason are required' },
        { status: 400 }
      );
    }

    const created = await createDisputeRecord({
      requestId: body.requestId,
      referenceCode: body.referenceCode || body.requestId,
      venueId: body.venueId,
      djId: body.djId,
      guestName: body.guestName || 'Guest',
      djName: body.djName || 'Resident DJ',
      venueName: body.venueName || 'Live Venue',
      songTitle: body.songTitle || 'Requested Track',
      amount: body.amount,
      reason: body.reason.trim(),
    });

    return NextResponse.json({ status: 'created', dispute: created }, { status: 201 });
  } catch (err) {
    console.error('[Admin Disputes API] POST error:', err);
    return NextResponse.json({ error: 'Failed to process dispute request' }, { status: 500 });
  }
}
