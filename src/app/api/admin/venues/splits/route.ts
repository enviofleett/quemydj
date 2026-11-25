import { NextRequest, NextResponse } from 'next/server';
import { VenueCommissionSplit } from '@/types';
import { validateCommissionSplit } from '@/services/financeService';
import { listVenues, updateVenueCommissionSplit } from '@/services/serverDataStore';

export async function GET() {
  try {
    const venues = await listVenues();
    return NextResponse.json({
      splits: venues.map((v) => ({
        venueId: v.id,
        venueName: v.name,
        city: v.city,
        commissionSplit: v.commissionSplit,
        paystackSplitCode: v.paystackSplitCode || null,
        paystackSubaccountCode: v.paystackSubaccountCode || null,
      })),
    });
  } catch (err) {
    console.error('[Admin Splits API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch venue splits' }, { status: 500 });
  }
}

async function handleUpdateSplit(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      venueId?: string;
      venuePercentage?: number;
      djPercentage?: number;
      platformPercentage?: number;
      commissionSplit?: VenueCommissionSplit;
      updatedBy?: string;
    };

    const venueId = body.venueId;
    if (!venueId) {
      return NextResponse.json({ error: 'venueId is required' }, { status: 400 });
    }

    const split: VenueCommissionSplit = body.commissionSplit || {
      venuePercentage: Number(body.venuePercentage),
      djPercentage: Number(body.djPercentage),
      platformPercentage: Number(body.platformPercentage ?? 10),
    };

    const validation = validateCommissionSplit(split);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updated = await updateVenueCommissionSplit(
      venueId,
      split,
      body.updatedBy || 'super_admin'
    );
    if (!updated) {
      return NextResponse.json({ error: `Venue '${venueId}' not found` }, { status: 404 });
    }

    return NextResponse.json({
      status: 'updated',
      venueId: updated.id,
      venueName: updated.name,
      commissionSplit: updated.commissionSplit,
    });
  } catch (err) {
    console.error('[Admin Splits API] update error:', err);
    return NextResponse.json({ error: 'Failed to update venue commission split' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  return handleUpdateSplit(request);
}

export async function POST(request: NextRequest) {
  return handleUpdateSplit(request);
}
