import { NextRequest, NextResponse } from 'next/server';
import {
  executeVenueSettlementUseCase,
  getVenueSettlementSummary,
} from '@/services/settlementService';

export async function GET(request: NextRequest) {
  try {
    const venueId = request.nextUrl.searchParams.get('venueId')?.trim() || 'venue-skyline';
    const summary = await getVenueSettlementSummary(venueId);

    if (!summary) {
      return NextResponse.json({ error: `Venue '${venueId}' not found` }, { status: 404 });
    }

    return NextResponse.json(summary);
  } catch (err) {
    console.error('[Venue Settlement API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch venue settlement report' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      venueId?: string;
      requestIds?: string[];
      idempotencyKey?: string;
      initiatedBy?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    if (!body.venueId) {
      return NextResponse.json({ error: 'venueId is required' }, { status: 400 });
    }

    const result = await executeVenueSettlementUseCase({
      venueId: body.venueId,
      requestIds: body.requestIds,
      idempotencyKey: body.idempotencyKey,
      initiatedBy: body.initiatedBy,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json(
      {
        settled: result.settled,
        idempotent: Boolean(result.idempotent),
        message: result.message,
        venue: result.venue,
        report: result.report,
        settlement: result.settlement,
      },
      { status: result.httpStatus }
    );
  } catch (err) {
    console.error('[Venue Settlement API] POST error:', err);
    return NextResponse.json({ error: 'Failed to execute venue settlement' }, { status: 500 });
  }
}
