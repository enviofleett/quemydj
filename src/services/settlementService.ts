import { ClubVenue } from '@/types';
import {
  calculateCommissionSplit,
  computeVenueEarningsReport,
  doesRequestBelongToVenue,
  ExtendedVenueReport,
  isEligibleForSettlement,
  SplitBreakdown,
} from './financeService';
import { getPaystackConfig } from './paystackService';
import {
  findVenueForContext,
  listDjs,
  listSongRequests,
  listWalletTransactions,
  recordVenueSettlementTotals,
  recordWalletTransaction,
  updateSongRequest,
} from './serverDataStore';

export interface SettlementExecutionParams {
  venueId: string;
  requestIds?: string[];
  idempotencyKey?: string;
  initiatedBy?: string;
}

export interface SettlementRecord {
  settlementId: string;
  venueId: string;
  venueName: string;
  settledRequestCount: number;
  settledRequestIds: string[];
  splitBreakdown: SplitBreakdown;
  transferMode: 'paystack_transfer' | 'simulation_ledger';
  transferReference: string;
  settledAt: string;
  initiatedBy: string;
}

export interface SettlementResult {
  httpStatus: number;
  error?: string;
  settled: boolean;
  idempotent?: boolean;
  message: string;
  venue?: ClubVenue;
  report?: ExtendedVenueReport;
  settlement: SettlementRecord | null;
}

export async function getVenueSettlementSummary(venueId: string) {
  const venue = await findVenueForContext({ venueId });
  if (!venue) {
    return null;
  }

  const [requests, djs, transactions] = await Promise.all([
    listSongRequests(),
    listDjs(),
    listWalletTransactions({ venueId: venue.id }),
  ]);

  const report = computeVenueEarningsReport(venue, requests, djs);
  const settlementHistory = transactions.filter((t) => t.type === 'venue_settlement');

  return {
    venue,
    report,
    settlementHistory,
  };
}

export async function executeVenueSettlementUseCase(
  params: SettlementExecutionParams
): Promise<SettlementResult> {
  const { venueId, requestIds, idempotencyKey, initiatedBy = 'venue_portal' } = params;

  const venue = await findVenueForContext({ venueId });
  if (!venue) {
    return {
      httpStatus: 404,
      settled: false,
      error: `Venue '${venueId}' not found.`,
      message: 'Venue not found.',
      settlement: null,
    };
  }

  // Idempotency check by caller-supplied key
  if (idempotencyKey) {
    const existingTxs = await listWalletTransactions({ venueId: venue.id, type: 'venue_settlement' });
    const match = existingTxs.find((tx) => tx.reference === idempotencyKey);
    if (match) {
      const [requests, djs] = await Promise.all([listSongRequests(), listDjs()]);
      return {
        httpStatus: 200,
        settled: true,
        idempotent: true,
        message: 'Settlement already executed for this idempotency key.',
        venue,
        report: computeVenueEarningsReport(venue, requests, djs),
        settlement: null,
      };
    }
  }

  const [requests, djs] = await Promise.all([listSongRequests(), listDjs()]);
  const requestedSet = requestIds && requestIds.length > 0 ? new Set(requestIds) : null;

  const eligibleUnsettled = requests.filter((req) => {
    if (!doesRequestBelongToVenue(req, venue)) return false;
    if (!isEligibleForSettlement(req.status)) return false;
    if (req.settledAt) return false;
    if (requestedSet && !requestedSet.has(req.id) && !requestedSet.has(req.referenceCode)) {
      return false;
    }
    return true;
  });

  if (eligibleUnsettled.length === 0) {
    return {
      httpStatus: 200,
      settled: false,
      message: 'No unsettled eligible requests found for this venue.',
      venue,
      report: computeVenueEarningsReport(venue, requests, djs),
      settlement: null,
    };
  }

  const grossAmount = eligibleUnsettled.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const splitBreakdown = calculateCommissionSplit(grossAmount, venue.commissionSplit);

  const settledAt = new Date().toISOString();
  const settlementId =
    idempotencyKey || `STL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let transferMode: SettlementRecord['transferMode'] = 'simulation_ledger';
  let transferReference = `TRF-${settlementId}`;

  const paystackConfig = getPaystackConfig();
  if (
    paystackConfig.isConfigured &&
    paystackConfig.secretKey &&
    venue.paystackRecipientCode &&
    splitBreakdown.venueKobo > 0
  ) {
    try {
      const res = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: splitBreakdown.venueKobo,
          recipient: venue.paystackRecipientCode,
          reference: transferReference,
          reason: `QueMyDJ Venue Settlement: ${venue.name} (${eligibleUnsettled.length} requests)`,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = (await res.json().catch(() => null)) as {
        status?: boolean;
        data?: { transfer_code?: string; reference?: string };
      } | null;

      if (res.ok && data?.status) {
        transferMode = 'paystack_transfer';
        transferReference = data.data?.transfer_code || data.data?.reference || transferReference;
      }
    } catch (err) {
      console.warn('[Settlement] Paystack transfer fallback to ledger:', err);
    }
  }

  // Mark all settled requests
  await Promise.all(
    eligibleUnsettled.map((req) =>
      updateSongRequest(req.id, {
        settledAt,
        settlementId,
      })
    )
  );

  // Update venue lifetime totals
  const updatedVenue =
    (await recordVenueSettlementTotals(
      venue.id,
      splitBreakdown.grossAmount,
      splitBreakdown.venueAmount,
      settledAt
    )) || venue;

  // Record immutable split ledger entries
  const primaryDjId = eligibleUnsettled[0]?.djId || venue.activeDjId;

  await Promise.all([
    recordWalletTransaction({
      reference: settlementId,
      idempotencyKey: `${settlementId}:venue`,
      type: 'venue_settlement',
      direction: 'credit',
      amount: splitBreakdown.venueAmount,
      venueId: venue.id,
      provider: transferMode === 'paystack_transfer' ? 'paystack' : 'escrow_ledger',
      providerReference: transferReference,
      description: `Venue Commission Settlement (${venue.commissionSplit.venuePercentage}% of ₦${splitBreakdown.grossAmount.toLocaleString()})`,
      metadata: {
        settlementId,
        initiatedBy,
        settledRequestCount: eligibleUnsettled.length,
        splitBreakdown,
      },
    }),
    recordWalletTransaction({
      reference: `${settlementId}-DJ`,
      idempotencyKey: `${settlementId}:dj`,
      type: 'dj_settlement',
      direction: 'credit',
      amount: splitBreakdown.djAmount,
      venueId: venue.id,
      djId: primaryDjId,
      provider: 'escrow_ledger',
      providerReference: `${transferReference}-DJ`,
      description: `Resident DJ Payout (${venue.commissionSplit.djPercentage}% of ₦${splitBreakdown.grossAmount.toLocaleString()})`,
      metadata: { settlementId, splitBreakdown },
    }),
    recordWalletTransaction({
      reference: `${settlementId}-PLAT`,
      idempotencyKey: `${settlementId}:platform`,
      type: 'platform_fee',
      direction: 'credit',
      amount: splitBreakdown.platformAmount,
      venueId: venue.id,
      provider: 'escrow_ledger',
      providerReference: `${transferReference}-PLAT`,
      description: `QueMyDJ Platform Fee (${venue.commissionSplit.platformPercentage}% of ₦${splitBreakdown.grossAmount.toLocaleString()})`,
      metadata: { settlementId, splitBreakdown },
    }),
  ]);

  const refreshedRequests = await listSongRequests();

  return {
    httpStatus: 200,
    settled: true,
    idempotent: false,
    message: `Settled ₦${splitBreakdown.grossAmount.toLocaleString()} across ${eligibleUnsettled.length} request(s).`,
    venue: updatedVenue,
    report: computeVenueEarningsReport(updatedVenue, refreshedRequests, djs),
    settlement: {
      settlementId,
      venueId: updatedVenue.id,
      venueName: updatedVenue.name,
      settledRequestCount: eligibleUnsettled.length,
      settledRequestIds: eligibleUnsettled.map((r) => r.id),
      splitBreakdown,
      transferMode,
      transferReference,
      settledAt,
      initiatedBy,
    },
  };
}
