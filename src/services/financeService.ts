import { ClubVenue, DJ, SongRequest, VenueCommissionSplit, VenueEarningsReport } from '@/types';

export interface SplitBreakdown {
  grossAmount: number;
  grossKobo: number;
  venuePercentage: number;
  djPercentage: number;
  platformPercentage: number;
  venueAmount: number;
  djAmount: number;
  platformAmount: number;
  venueKobo: number;
  djKobo: number;
  platformKobo: number;
}

export const DEFAULT_COMMISSION_SPLIT: VenueCommissionSplit = {
  venuePercentage: 20,
  djPercentage: 70,
  platformPercentage: 10,
};

let activePlatformDefaultSplit: VenueCommissionSplit = { ...DEFAULT_COMMISSION_SPLIT };

export function getPlatformDefaultCommissionSplit(): VenueCommissionSplit {
  return { ...activePlatformDefaultSplit };
}

export function setPlatformDefaultCommissionSplit(newSplit: VenueCommissionSplit): {
  success: boolean;
  split: VenueCommissionSplit;
  error?: string;
} {
  const validation = validateCommissionSplit(newSplit);
  if (!validation.valid) {
    return { success: false, split: activePlatformDefaultSplit, error: validation.error };
  }

  activePlatformDefaultSplit = {
    venuePercentage: newSplit.venuePercentage,
    djPercentage: newSplit.djPercentage,
    platformPercentage: newSplit.platformPercentage,
  };

  return { success: true, split: activePlatformDefaultSplit };
}

/**
 * Validates that a venue/DJ/platform commission split has valid bounds and sums to 100%.
 */
export function validateCommissionSplit(split: VenueCommissionSplit): { valid: boolean; error?: string } {
  const { venuePercentage, djPercentage, platformPercentage } = split;
  const values = [venuePercentage, djPercentage, platformPercentage];

  if (values.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100)) {
    return { valid: false, error: 'All split percentages must be finite numbers between 0 and 100.' };
  }

  const total = Math.round((venuePercentage + djPercentage + platformPercentage) * 100) / 100;
  if (Math.abs(total - 100) > 0.01) {
    return {
      valid: false,
      error: `Commission split percentages must sum to 100% (currently ${total}%).`,
    };
  }

  return { valid: true };
}

/**
 * Computes exact integer-conserving revenue split in both major units (NGN) and minor units (kobo).
 * Any rounding remainder is assigned to the largest percentage party so parts always sum exactly to gross.
 */
export function calculateCommissionSplit(
  grossAmount: number,
  split?: VenueCommissionSplit,
  tipAmount: number = 0
): SplitBreakdown {
  const effectiveSplit = split || getPlatformDefaultCommissionSplit();

  if (!Number.isFinite(grossAmount) || grossAmount < 0) {
    throw new Error('Gross amount must be a non-negative finite number.');
  }

  const validation = validateCommissionSplit(effectiveSplit);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const safeGross = Math.round(grossAmount);
  const grossKobo = Math.round(grossAmount * 100);

  // Tips go 100% directly to the DJ, while the base amount is split according to commission rules
  const safeTip = Math.max(0, Math.min(Math.round(tipAmount), safeGross));
  const tipKobo = Math.round(safeTip * 100);
  const splittableGross = safeGross - safeTip;
  const splittableKobo = grossKobo - tipKobo;

  const allocateExact = (totalUnits: number): { venue: number; dj: number; platform: number } => {
    const rawVenue = Math.floor((totalUnits * effectiveSplit.venuePercentage) / 100);
    const rawDj = Math.floor((totalUnits * effectiveSplit.djPercentage) / 100);
    const rawPlatform = Math.floor((totalUnits * effectiveSplit.platformPercentage) / 100);

    // Distribute remaining units by largest fractional remainder (Hamilton method)
    let remainder = totalUnits - (rawVenue + rawDj + rawPlatform);
    const fractions = [
      { key: 'dj' as const, frac: ((totalUnits * effectiveSplit.djPercentage) / 100) - rawDj, pct: effectiveSplit.djPercentage },
      { key: 'venue' as const, frac: ((totalUnits * effectiveSplit.venuePercentage) / 100) - rawVenue, pct: effectiveSplit.venuePercentage },
      { key: 'platform' as const, frac: ((totalUnits * effectiveSplit.platformPercentage) / 100) - rawPlatform, pct: effectiveSplit.platformPercentage },
    ].sort((a, b) => (b.frac !== a.frac ? b.frac - a.frac : b.pct - a.pct));

    const out = { venue: rawVenue, dj: rawDj, platform: rawPlatform };
    let idx = 0;
    while (remainder > 0 && idx < fractions.length) {
      out[fractions[idx].key] += 1;
      remainder -= 1;
      idx += 1;
    }
    return out;
  };

  const major = allocateExact(splittableGross);
  const kobo = allocateExact(splittableKobo);

  // Add 100% of the tip to the DJ's allocation
  major.dj += safeTip;
  kobo.dj += tipKobo;

  return {
    grossAmount: safeGross,
    grossKobo,
    venuePercentage: effectiveSplit.venuePercentage,
    djPercentage: effectiveSplit.djPercentage,
    platformPercentage: effectiveSplit.platformPercentage,
    venueAmount: major.venue,
    djAmount: major.dj,
    platformAmount: major.platform,
    venueKobo: kobo.venue,
    djKobo: kobo.dj,
    platformKobo: kobo.platform,
  };
}

export function isEligibleForSettlement(status: SongRequest['status']): boolean {
  return (
    status === 'played' ||
    status === 'playing' ||
    status === 'accepted' ||
    status === 'ready_to_play' ||
    status === 'payment_confirmed'
  );
}

export function doesRequestBelongToVenue(req: SongRequest, venue: ClubVenue): boolean {
  if (req.venueId && req.venueId === venue.id) return true;
  if (req.venueName && venue.name && req.venueName.toLowerCase().includes(venue.name.toLowerCase())) {
    return true;
  }
  if (venue.activeDjId && req.djId === venue.activeDjId) return true;
  return false;
}

export interface ExtendedVenueReport extends VenueEarningsReport {
  unsettledGrossRevenue: number;
  unsettledVenueCommission: number;
  unsettledDjPayout: number;
  unsettledPlatformFee: number;
  unsettledRequestIds: string[];
  eligibleRequestsCount: number;
  refundedRequestsCount: number;
  splitRule: VenueCommissionSplit;
}

export function computeVenueEarningsReport(
  venue: ClubVenue,
  requests: SongRequest[],
  djs: DJ[]
): ExtendedVenueReport {
  const venueRequests = requests.filter((r) => doesRequestBelongToVenue(r, venue));
  const activeDj = djs.find((d) => d.id === venue.activeDjId);

  const eligibleRequests = venueRequests.filter((r) => isEligibleForSettlement(r.status));
  const unsettledEligible = eligibleRequests.filter((r) => !r.settledAt);

  const totalGross = eligibleRequests.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const totalSplit = calculateCommissionSplit(totalGross, venue.commissionSplit);

  const unsettledGross = unsettledEligible.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const unsettledSplit = calculateCommissionSplit(unsettledGross, venue.commissionSplit);

  const declinedCount = venueRequests.filter((r) => r.status === 'declined' || r.status === 'refunded').length;

  // Next 6:00 AM sweep window ISO
  const nextPayout = new Date();
  nextPayout.setHours(6, 0, 0, 0);
  if (nextPayout.getTime() <= Date.now()) {
    nextPayout.setDate(nextPayout.getDate() + 1);
  }

  return {
    venueId: venue.id,
    venueName: venue.name,
    tonightGrossRevenue: totalSplit.grossAmount,
    tonightVenueCommission: totalSplit.venueAmount,
    tonightDjPayout: totalSplit.djAmount,
    tonightPlatformFee: totalSplit.platformAmount,
    totalRequestsCount: venueRequests.length,
    acceptedCount: eligibleRequests.length,
    declinedCount,
    activeDjName: activeDj?.name || 'Open Booth',
    nextPayoutDate: nextPayout.toISOString(),
    unsettledGrossRevenue: unsettledSplit.grossAmount,
    unsettledVenueCommission: unsettledSplit.venueAmount,
    unsettledDjPayout: unsettledSplit.djAmount,
    unsettledPlatformFee: unsettledSplit.platformAmount,
    unsettledRequestIds: unsettledEligible.map((r) => r.id),
    eligibleRequestsCount: eligibleRequests.length,
    refundedRequestsCount: venueRequests.filter((r) => r.status === 'refunded').length,
    splitRule: venue.commissionSplit,
  };
}
