import { DisputeRecord } from '@/types';
import { calculateCommissionSplit, DEFAULT_COMMISSION_SPLIT, SplitBreakdown } from './financeService';
import { initiatePaystackRefund } from './paystackService';
import {
  findVenueForContext,
  getDisputeById,
  getSongRequestByIdOrRef,
  recordWalletTransaction,
  updateDisputeRecord,
  updateSongRequest,
} from './serverDataStore';

export type DisputeAction = 'refund_guest' | 'release_to_dj';

export interface ResolveDisputeParams {
  disputeId: string;
  action: DisputeAction;
  resolutionNote?: string;
  resolvedBy?: string;
}

export interface ResolveDisputeResult {
  httpStatus: number;
  error?: string;
  idempotent?: boolean;
  dispute?: DisputeRecord;
  splitBreakdown?: SplitBreakdown;
  refundResult?: {
    refunded: boolean;
    refundReference: string;
    message: string;
  };
}

export async function resolveDisputeUseCase(
  params: ResolveDisputeParams
): Promise<ResolveDisputeResult> {
  const { disputeId, action, resolutionNote, resolvedBy = 'super_admin' } = params;

  if (action !== 'refund_guest' && action !== 'release_to_dj') {
    return {
      httpStatus: 400,
      error: "Invalid resolution action. Must be 'refund_guest' or 'release_to_dj'.",
    };
  }

  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    return { httpStatus: 404, error: `Dispute ${disputeId} not found.` };
  }

  const targetStatus = action === 'refund_guest' ? 'refunded' : 'resolved_to_dj';

  // Idempotency & conflict protection
  if (dispute.status !== 'open') {
    if (dispute.status === targetStatus) {
      return {
        httpStatus: 200,
        idempotent: true,
        dispute,
      };
    }
    return {
      httpStatus: 409,
      error: `Dispute ${disputeId} is already finalized with status '${dispute.status}'.`,
    };
  }

  const now = new Date().toISOString();
  const linkedRequest =
    (await getSongRequestByIdOrRef(dispute.requestId)) ||
    (await getSongRequestByIdOrRef(dispute.referenceCode));

  if (action === 'refund_guest') {
    const paymentRef = linkedRequest?.paymentReference || dispute.referenceCode;
    const refund = await initiatePaystackRefund(
      paymentRef,
      dispute.amount,
      resolutionNote || dispute.reason
    );

    if (!refund.refunded) {
      return {
        httpStatus: 502,
        error: refund.message || 'Upstream refund initiation failed.',
      };
    }

    if (linkedRequest) {
      await updateSongRequest(linkedRequest.id, {
        status: 'refunded',
        declineReason: resolutionNote || 'Umpire dispute arbitration: refunded to guest.',
        refundTxId: refund.refundReference,
        refundedAt: now,
      });
    }

    const updatedDispute = await updateDisputeRecord(dispute.id, {
      status: 'refunded',
      resolvedAt: now,
      resolvedBy,
      refundReference: refund.refundReference,
      resolutionNote:
        resolutionNote?.trim() ||
        `Umpire forced full ₦${dispute.amount.toLocaleString()} refund to guest (${refund.refundReference}).`,
    });

    await recordWalletTransaction({
      reference: refund.refundReference,
      idempotencyKey: `dispute-refund:${dispute.id}`,
      type: 'refund',
      direction: 'credit',
      amount: dispute.amount,
      venueId: dispute.venueId || linkedRequest?.venueId,
      djId: dispute.djId || linkedRequest?.djId,
      requestId: linkedRequest?.id || dispute.requestId,
      provider: 'paystack',
      providerReference: refund.refundReference,
      description: `Dispute Refund: ${dispute.songTitle} (${dispute.referenceCode})`,
      metadata: {
        disputeId: dispute.id,
        resolvedBy,
        mode: refund.mode,
      },
    });

    return {
      httpStatus: 200,
      idempotent: false,
      dispute: updatedDispute || { ...dispute, status: 'refunded', resolvedAt: now },
      refundResult: {
        refunded: true,
        refundReference: refund.refundReference,
        message: refund.message,
      },
    };
  }

  // action === 'release_to_dj'
  const venue = await findVenueForContext({
    venueId: dispute.venueId || linkedRequest?.venueId,
    venueName: dispute.venueName,
    djId: dispute.djId || linkedRequest?.djId,
  });

  const splitRule = venue?.commissionSplit || DEFAULT_COMMISSION_SPLIT;
  const splitBreakdown = calculateCommissionSplit(dispute.amount, splitRule);

  if (linkedRequest && linkedRequest.status !== 'played') {
    await updateSongRequest(linkedRequest.id, {
      status: 'played',
    });
  }

  const releaseRef = `REL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const updatedDispute = await updateDisputeRecord(dispute.id, {
    status: 'resolved_to_dj',
    resolvedAt: now,
    resolvedBy,
    resolutionNote:
      resolutionNote?.trim() ||
      `Dispute resolved in DJ favor; ₦${splitBreakdown.djAmount.toLocaleString()} DJ / ₦${splitBreakdown.venueAmount.toLocaleString()} Venue / ₦${splitBreakdown.platformAmount.toLocaleString()} Platform released.`,
  });

  await recordWalletTransaction({
    reference: releaseRef,
    idempotencyKey: `dispute-release:${dispute.id}`,
    type: 'escrow_release',
    direction: 'credit',
    amount: splitBreakdown.djAmount,
    venueId: venue?.id || dispute.venueId,
    djId: dispute.djId || linkedRequest?.djId,
    requestId: linkedRequest?.id || dispute.requestId,
    provider: 'escrow_ledger',
    providerReference: releaseRef,
    description: `Escrow Released to DJ (${dispute.referenceCode})`,
    metadata: {
      disputeId: dispute.id,
      resolvedBy,
      splitBreakdown,
    },
  });

  return {
    httpStatus: 200,
    idempotent: false,
    dispute: updatedDispute || { ...dispute, status: 'resolved_to_dj', resolvedAt: now },
    splitBreakdown,
  };
}
