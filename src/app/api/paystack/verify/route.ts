import { NextRequest, NextResponse } from 'next/server';
import { confirmPaystackPayment, getPaystackConfig } from '@/services/paystackService';
import {
  getPaymentIntent,
  getSongRequestByIdOrRef,
  hasProcessedPaymentReference,
} from '@/services/serverDataStore';
import { Song, VenueCommissionSplit } from '@/types';

async function verifyTransactionReference(reference: string, allowSimulated: boolean) {
  const cleanRef = reference.trim();
  if (!cleanRef || !/^[A-Za-z0-9_-]{4,120}$/.test(cleanRef)) {
    return NextResponse.json({ error: 'Invalid transaction reference format', verified: false }, { status: 400 });
  }

  const alreadyDone = await hasProcessedPaymentReference(cleanRef);
  const existingRequest = await getSongRequestByIdOrRef(cleanRef);
  const intent = getPaymentIntent(cleanRef);

  if (alreadyDone && existingRequest) {
    return NextResponse.json({
      status: 'success',
      verified: true,
      idempotent: true,
      reference: cleanRef,
      amount: existingRequest.total,
      currency: existingRequest.currency || 'NGN',
      request: existingRequest,
    });
  }

  const paystackConfig = getPaystackConfig();

  // If allowSimulated is explicitly true, allow testing flow without external card swipe
  if (allowSimulated) {
    const isKnownTestPrefix = /^(CMDJ|WAL|TEST)-/i.test(cleanRef);
    if (intent || existingRequest || isKnownTestPrefix) {
      const amountKobo = intent?.amountKobo || (existingRequest ? existingRequest.total * 100 : 550000);
      const confirmed = await confirmPaystackPayment({
        reference: cleanRef,
        amountKobo,
        currency: intent?.currency || 'NGN',
        channel: 'test_simulation',
        customerEmail: intent?.email,
        source: 'verify_endpoint',
        metadata: intent?.metadata as any,
      });

      return NextResponse.json({
        status: 'success',
        verified: true,
        mode: paystackConfig.mode,
        simulated: true,
        idempotent: confirmed.idempotent,
        reference: confirmed.reference,
        amount: confirmed.amountMajor,
        currency: confirmed.currency,
        splitBreakdown: confirmed.splitBreakdown,
        request: confirmed.request,
      });
    }
  }

  if (paystackConfig.isConfigured && paystackConfig.secretKey) {
    try {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanRef)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${paystackConfig.secretKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      const data = (await res.json().catch(() => null)) as {
        status?: boolean;
        message?: string;
        data?: {
          reference?: string;
          amount?: number;
          currency?: string;
          status?: string;
          channel?: string;
          paid_at?: string;
          gateway_response?: string;
          customer?: { email?: string };
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
      } | null;

      if (!res.ok || !data?.status || !data.data) {
        return NextResponse.json(
          {
            status: 'error',
            verified: false,
            reference: cleanRef,
            message: data?.message || 'Unable to verify transaction with Paystack',
          },
          { status: res.status === 404 ? 404 : 502 }
        );
      }

      const tx = data.data;
      if (tx.status !== 'success') {
        return NextResponse.json(
          {
            status: 'failed',
            verified: false,
            reference: cleanRef,
            gatewayStatus: tx.status,
            message: tx.gateway_response || `Transaction status is ${tx.status}`,
          },
          { status: 402 }
        );
      }

      const confirmed = await confirmPaystackPayment({
        reference: tx.reference || cleanRef,
        amountKobo: tx.amount || intent?.amountKobo || 0,
        currency: tx.currency || 'NGN',
        channel: tx.channel,
        customerEmail: tx.customer?.email,
        paidAt: tx.paid_at,
        source: 'verify_endpoint',
        metadata: tx.metadata,
      });

      return NextResponse.json({
        status: 'success',
        verified: true,
        mode: paystackConfig.mode,
        idempotent: confirmed.idempotent,
        reference: confirmed.reference,
        amount: confirmed.amountMajor,
        currency: confirmed.currency,
        splitBreakdown: confirmed.splitBreakdown,
        request: confirmed.request,
      });
    } catch (err) {
      console.error('[Paystack Verify] Upstream error:', err);
      return NextResponse.json(
        { error: 'Failed to contact Paystack verification API', verified: false },
        { status: 502 }
      );
    }
  }

  // Simulation / Test fallback when Paystack secret is not configured
  const isKnownTestPrefix = /^(CMDJ|WAL|TEST)-/i.test(cleanRef);
  if (intent || existingRequest || (allowSimulated && isKnownTestPrefix)) {
    const amountKobo = intent?.amountKobo || (existingRequest ? existingRequest.total * 100 : 550000);
    const confirmed = await confirmPaystackPayment({
      reference: cleanRef,
      amountKobo,
      currency: intent?.currency || 'NGN',
      channel: 'simulation',
      customerEmail: intent?.email,
      source: 'verify_endpoint',
    });

    return NextResponse.json({
      status: 'success',
      verified: true,
      mode: 'simulation',
      simulated: true,
      idempotent: confirmed.idempotent,
      reference: confirmed.reference,
      amount: confirmed.amountMajor,
      currency: confirmed.currency,
      splitBreakdown: confirmed.splitBreakdown,
      request: confirmed.request,
    });
  }

  return NextResponse.json(
    { error: 'Transaction reference not found', verified: false, reference: cleanRef },
    { status: 404 }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const simulated = searchParams.get('simulated') === 'true' || searchParams.get('simulated_payment') === 'true';

  if (!reference) {
    return NextResponse.json(
      { error: 'Missing required reference query parameter', verified: false },
      { status: 400 }
    );
  }

  return verifyTransactionReference(reference, simulated);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      reference?: string;
      trxref?: string;
      simulated?: boolean;
    };
    const reference = body?.reference || body?.trxref;
    if (!reference) {
      return NextResponse.json(
        { error: 'Missing required reference in request body', verified: false },
        { status: 400 }
      );
    }
    return verifyTransactionReference(reference, Boolean(body.simulated));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body', verified: false }, { status: 400 });
  }
}
