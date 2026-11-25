import { NextRequest, NextResponse } from 'next/server';
import {
  confirmPaystackPayment,
  getPaystackConfig,
  verifyPaystackSignature,
} from '@/services/paystackService';
import { updateSongRequest } from '@/services/serverDataStore';
import { Song, VenueCommissionSplit } from '@/types';

interface PaystackWebhookEvent {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    channel?: string;
    paid_at?: string;
    transaction_reference?: string;
    customer?: {
      email?: string;
    };
    metadata?: {
      type?: 'song_request' | 'wallet_topup';
      sessionId?: string;
      djId?: string;
      djName?: string;
      djAvatar?: string;
      venueId?: string;
      venueName?: string;
      guestName?: string;
      guestNote?: string;
      serviceFee?: number;
      song?: Song;
      splitRule?: VenueCommissionSplit;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ error: 'Empty webhook payload' }, { status: 400 });
    }

    const paystackConfig = getPaystackConfig();
    const paystackSignature = request.headers.get('x-paystack-signature');

    // Mandatory cryptographic HMAC-SHA512 verification when secret is configured
    if (paystackConfig.isConfigured && paystackConfig.secretKey) {
      if (!paystackSignature) {
        return NextResponse.json(
          { error: 'Missing x-paystack-signature header' },
          { status: 401 }
        );
      }

      const validSig = verifyPaystackSignature(
        rawBody,
        paystackSignature,
        paystackConfig.secretKey
      );
      if (!validSig) {
        console.warn('[Paystack Webhook] Unauthorized signature mismatch');
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
      }
    } else {
      // Production MUST have PAYSTACK_SECRET_KEY configured
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Paystack webhook secret is not configured' },
          { status: 503 }
        );
      }

      // In non-production dev/test mode, verify against fallback test secret if signature is present,
      // or require explicit simulation header if no secret is set
      const devFallbackSecret =
        process.env.PAYSTACK_WEBHOOK_TEST_SECRET || 'quemydj_dev_webhook_secret';
      const isSimHeader = request.headers.get('x-paystack-test-mode') === 'simulation';

      if (paystackSignature) {
        const validDevSig = verifyPaystackSignature(rawBody, paystackSignature, devFallbackSecret);
        if (!validDevSig) {
          return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
        }
      } else if (!isSimHeader) {
        return NextResponse.json(
          { error: 'Missing x-paystack-signature header' },
          { status: 401 }
        );
      }
    }

    let event: PaystackWebhookEvent;
    try {
      event = JSON.parse(rawBody) as PaystackWebhookEvent;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON webhook body' }, { status: 400 });
    }

    if (!event?.event || !event?.data) {
      return NextResponse.json({ error: 'Malformed webhook event structure' }, { status: 400 });
    }

    // Handle Paystack 'charge.success'
    if (event.event === 'charge.success') {
      const { reference, amount, currency, channel, customer, paid_at, metadata, status } = event.data;

      if (!reference || typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json(
          { error: 'Missing valid transaction reference or amount in charge.success payload' },
          { status: 400 }
        );
      }

      if (status && status !== 'success') {
        return NextResponse.json({
          received: true,
          ignored: true,
          reason: `Charge status is ${status}`,
          reference,
        });
      }

      const result = await confirmPaystackPayment({
        reference,
        amountKobo: amount,
        currency: currency || 'NGN',
        channel,
        customerEmail: customer?.email,
        paidAt: paid_at,
        source: 'webhook',
        metadata,
      });

      return NextResponse.json({
        received: true,
        status: 'payment_verified',
        idempotent: result.idempotent,
        alreadyProcessed: result.alreadyProcessed,
        reference: result.reference,
        amountMajor: result.amountMajor,
        currency: result.currency,
        sessionId: result.request?.sessionId || metadata?.sessionId,
        songTitle: result.request?.song?.title || metadata?.song?.title,
        splitBreakdown: result.splitBreakdown,
        requestId: result.request?.id || null,
      });
    }

    if (event.event === 'charge.failed' && event.data.reference) {
      await updateSongRequest(event.data.reference, {
        status: 'declined',
        declineReason: 'Payment authorization failed at gateway.',
      });
      return NextResponse.json({
        received: true,
        event: 'charge.failed',
        reference: event.data.reference,
      });
    }

    if (
      (event.event === 'refund.processed' || event.event === 'refund.pending') &&
      (event.data.transaction_reference || event.data.reference)
    ) {
      const ref = event.data.transaction_reference || event.data.reference!;
      await updateSongRequest(ref, {
        status: event.event === 'refund.processed' ? 'refunded' : 'refund_pending',
        refundedAt: new Date().toISOString(),
      });
      return NextResponse.json({
        received: true,
        event: event.event,
        reference: ref,
      });
    }

    return NextResponse.json({
      received: true,
      ignored: true,
      event: event.event,
    });
  } catch (err) {
    console.error('Paystack webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
