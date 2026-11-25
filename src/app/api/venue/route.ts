import { NextRequest, NextResponse } from 'next/server';
import { ClubVenue, VenueCommissionSplit } from '@/types';
import {
  computeVenueEarningsReport,
  DEFAULT_COMMISSION_SPLIT,
  validateCommissionSplit,
} from '@/services/financeService';
import {
  createVenueRecord,
  listDjs,
  listSongRequests,
  listVenues,
  updateVenueCommissionSplit,
} from '@/services/serverDataStore';

export async function GET(request: NextRequest) {
  try {
    const venueId = request.nextUrl.searchParams.get('venueId')?.trim();
    const [venues, requests, djs] = await Promise.all([
      listVenues(),
      listSongRequests(),
      listDjs(),
    ]);

    const filtered = venueId
      ? venues.filter((v) => v.id === venueId || v.slug === venueId)
      : venues;

    if (venueId && filtered.length === 0) {
      return NextResponse.json({ error: `Venue '${venueId}' not found` }, { status: 404 });
    }

    const enriched = filtered.map((venue) => ({
      ...venue,
      earningsReport: computeVenueEarningsReport(venue, requests, djs),
    }));

    return NextResponse.json({
      venues: enriched,
      count: enriched.length,
    });
  } catch (err) {
    console.error('[Venue API] GET error:', err);
    return NextResponse.json({ error: 'Failed to load venues' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ClubVenue>;
    if (!body.name || !body.city || !body.ownerName || !body.ownerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: name, city, ownerName, ownerEmail' },
        { status: 400 }
      );
    }

    const split: VenueCommissionSplit = body.commissionSplit || DEFAULT_COMMISSION_SPLIT;
    const splitCheck = validateCommissionSplit(split);
    if (!splitCheck.valid) {
      return NextResponse.json({ error: splitCheck.error }, { status: 400 });
    }

    const slug =
      body.slug ||
      body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const created = await createVenueRecord({
      name: body.name.trim(),
      slug,
      address: body.address?.trim() || '',
      city: body.city.trim(),
      coverImage:
        body.coverImage ||
        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=1200&auto=format&fit=crop',
      ownerName: body.ownerName.trim(),
      ownerEmail: body.ownerEmail.trim(),
      ownerPhone: body.ownerPhone?.trim() || '',
      bankDetails: body.bankDetails || {
        bankName: '',
        accountNumber: '',
        accountName: '',
      },
      commissionSplit: split,
      activeDjId: body.activeDjId,
      status: body.status || 'active',
      rating: body.rating ?? 4.8,
      paystackSubaccountCode: body.paystackSubaccountCode,
      paystackSplitCode: body.paystackSplitCode,
      paystackRecipientCode: body.paystackRecipientCode,
    });

    return NextResponse.json({ status: 'created', venue: created }, { status: 201 });
  } catch (err) {
    console.error('[Venue API] POST error:', err);
    return NextResponse.json({ error: 'Failed to register venue' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      venueId?: string;
      commissionSplit?: VenueCommissionSplit;
      updatedBy?: string;
    };

    if (!body.venueId || !body.commissionSplit) {
      return NextResponse.json(
        { error: 'venueId and commissionSplit are required' },
        { status: 400 }
      );
    }

    const check = validateCommissionSplit(body.commissionSplit);
    if (!check.valid) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const updated = await updateVenueCommissionSplit(
      body.venueId,
      body.commissionSplit,
      body.updatedBy || 'venue_admin'
    );
    if (!updated) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json({ status: 'updated', venue: updated });
  } catch (err) {
    console.error('[Venue API] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 });
  }
}
