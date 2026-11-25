import { NextRequest, NextResponse } from 'next/server';
import {
  getPlatformDefaultCommissionSplit,
  setPlatformDefaultCommissionSplit,
  validateCommissionSplit,
} from '@/services/financeService';

export async function GET() {
  const defaultSplit = getPlatformDefaultCommissionSplit();
  return NextResponse.json({
    success: true,
    defaultSplit,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { djPercentage, venuePercentage, platformPercentage, updatedBy } = body;

    const newSplit = {
      djPercentage: Number(djPercentage),
      venuePercentage: Number(venuePercentage),
      platformPercentage: Number(platformPercentage),
    };

    const validation = validateCommissionSplit(newSplit);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = setPlatformDefaultCommissionSplit(newSplit);

    return NextResponse.json({
      success: true,
      defaultSplit: result.split,
      message: `Default platform commission split successfully updated by ${updatedBy || 'Super Admin'}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update default commission split';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
