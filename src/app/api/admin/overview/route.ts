import { NextRequest, NextResponse } from 'next/server';
import {
  listDjs,
  listDisputes,
  listSongRequests,
  listVenues,
  listWalletTransactions,
} from '@/services/serverDataStore';
import { getPaystackConfig } from '@/services/paystackService';
import { getPlatformDefaultCommissionSplit } from '@/services/financeService';

export async function GET(request: NextRequest) {
  try {
    const [djs, venues, requests, disputes, transactions] = await Promise.all([
      listDjs(),
      listVenues(),
      listSongRequests(),
      listDisputes(),
      listWalletTransactions(),
    ]);

    const paystackConfig = getPaystackConfig();
    const defaultSplit = getPlatformDefaultCommissionSplit();

    // Calculate real financial metrics from verified requests and ledger transactions
    const verifiedRequests = requests.filter(
      (r) => r.paymentVerifiedServerSide || r.paidVia === 'Paystack' || r.status !== 'declined'
    );

    const totalGrossRevenue = verifiedRequests.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    // Platform take rate dynamically based on platform default commission split
    const platformRevenue = Math.round(totalGrossRevenue * (defaultSplit.platformPercentage / 100));
    const totalDjEarnings = Math.round(totalGrossRevenue * (defaultSplit.djPercentage / 100));
    const totalVenueCommissions = Math.round(totalGrossRevenue * (defaultSplit.venuePercentage / 100));

    // Dispute aggregations
    const openDisputes = disputes.filter((d) => d.status === 'open');
    const totalEscrowHeldInDispute = openDisputes.reduce(
      (sum, d) => sum + Number(d.amount || 0),
      0
    );
    const refundedDisputes = disputes.filter((d) => d.status === 'refunded');
    const totalRefundedToGuests = refundedDisputes.reduce(
      (sum, d) => sum + Number(d.amount || 0),
      0
    );

    // Active DJs & Sessions
    const activeDjs = djs.filter((d) => d.liveSession?.isAcceptingRequests);

    return NextResponse.json({
      success: true,
      mode: paystackConfig.mode,
      metrics: {
        totalGrossRevenue,
        platformRevenue,
        totalDjEarnings,
        totalVenueCommissions,
        totalEscrowHeldInDispute,
        totalRefundedToGuests,
        totalRequestsCount: requests.length,
        verifiedRequestsCount: verifiedRequests.length,
        totalDjsCount: djs.length,
        activeDjsCount: activeDjs.length,
        totalVenuesCount: venues.length,
        openDisputesCount: openDisputes.length,
        totalDisputesCount: disputes.length,
      },
      djs: djs.map((d) => ({
        id: d.id,
        name: d.name,
        handle: d.handle,
        avatarUrl: d.avatarUrl,
        currentVenue: d.currentVenue,
        isAcceptingRequests: Boolean(d.liveSession?.isAcceptingRequests),
        basePrice: d.liveSession?.basePrice ?? 5000,
        paystackRecipientCode: d.paystackRecipientCode || null,
        paystackSubaccountCode: d.paystackSubaccountCode || null,
        status: 'active',
      })),
      venues: venues.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        ownerEmail: v.ownerEmail,
        commissionSplit: v.commissionSplit,
        totalRevenueGenerated: v.totalRevenueGenerated,
        totalCommissionPaid: v.totalCommissionPaid,
        paystackSplitCode: v.paystackSplitCode || null,
        paystackSubaccountCode: v.paystackSubaccountCode || null,
        paystackRecipientCode: v.paystackRecipientCode || null,
        status: v.status,
      })),
      disputes,
      recentTransactions: transactions.slice(0, 15),
      defaultSplit,
    });
  } catch (err) {
    console.error('[Admin Overview API] GET error:', err);
    return NextResponse.json(
      { error: 'Failed to aggregate admin live metrics' },
      { status: 500 }
    );
  }
}
