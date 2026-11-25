import { NextRequest, NextResponse } from 'next/server';
import { Song, VenueCommissionSplit } from '@/types';
import { findVenueForContext, getDjById, savePaymentIntent } from '@/services/serverDataStore';
import { buildPaystackSplitConfig, getPaystackConfig } from '@/services/paystackService';
import { validateCommissionSplit } from '@/services/financeService';

interface InitializePayload {
  email?: string;
  amount: number; // Major currency units (e.g., 5500 NGN) unless amountInMinorUnits is true
  tip?: number;
  amountInMinorUnits?: boolean;
  sessionId?: string;
  djId?: string;
  venueId?: string;
  song?: Song;
  guestName?: string;
  guestNote?: string;
  currency?: string;
  type?: 'song_request' | 'wallet_topup';
  callbackUrl?: string;
  split?: VenueCommissionSplit;
  splitCode?: string;
  venueSubaccountCode?: string;
  djSubaccountCode?: string;
}

const SUPPORTED_CURRENCIES = new Set(['NGN', 'USD', 'GHS', 'ZAR', 'KES']);

export async function POST(request: NextRequest) {
  try {
    let body: InitializePayload;
    try {
      body = (await request.json()) as InitializePayload;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const {
      email,
      amount,
      tip = 0,
      amountInMinorUnits = false,
      sessionId,
      djId = 'dj-kofi',
      venueId,
      song,
      guestName = 'Guest',
      guestNote,
      currency = 'NGN',
      type = 'song_request',
      callbackUrl,
      split,
      splitCode,
      venueSubaccountCode,
      djSubaccountCode,
    } = body;

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (type === 'song_request' && (!sessionId || !song || !song.title)) {
      return NextResponse.json(
        { error: 'Missing required request parameters: sessionId and song are required' },
        { status: 400 }
      );
    }

    if (split) {
      const splitValidation = validateCommissionSplit(split);
      if (!splitValidation.valid) {
        return NextResponse.json({ error: splitValidation.error }, { status: 400 });
      }
    }

    const normalizedCurrency = SUPPORTED_CURRENCIES.has(currency.toUpperCase())
      ? currency.toUpperCase()
      : 'NGN';

    const amountMajor = amountInMinorUnits ? amount / 100 : amount;
    const amountKobo = Math.round(amountMajor * 100);
    if (amountKobo < 100) {
      return NextResponse.json(
        { error: 'Amount is below minimum transaction threshold' },
        { status: 400 }
      );
    }

    const dj = await getDjById(djId);
    const venue = await findVenueForContext({
      venueId,
      venueName: dj?.currentVenue?.name,
      djId: dj?.id,
    });

    const { splitBreakdown, paystackFields, routingMode } = buildPaystackSplitConfig({
      amountMajor,
      tipMajor: tip,
      currency: normalizedCurrency,
      split,
      venue,
      dj,
      overrideSplitCode: splitCode,
      overrideVenueSubaccount: venueSubaccountCode,
      overrideDjSubaccount: djSubaccountCode,
    });

    const referencePrefix = type === 'wallet_topup' ? 'WAL' : 'CMDJ';
    const reference = `${referencePrefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerEmail = email && email.includes('@') ? email.trim() : 'guest@cuemydj.com';
    const paystackConfig = getPaystackConfig();

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl?.origin ||
      'http://localhost:3000';
    const defaultCallback = type === 'wallet_topup' ? `${origin}/wallet?reference=${reference}` : `${origin}/requests/${reference}`;
    const resolvedCallbackUrl = callbackUrl || defaultCallback;

    // For wallet topups, we hold funds directly in platform escrow (no DJ/venue instant split)
    const effectivePaystackFields = type === 'wallet_topup' ? {} : paystackFields;

    savePaymentIntent({
      reference,
      email: customerEmail,
      amount: amountMajor,
      amountKobo,
      tip,
      currency: normalizedCurrency,
      sessionId: sessionId || 'wallet-topup',
      djId: dj?.id || djId,
      venueId: venue?.id,
      guestName: guestName.trim() || 'Guest',
      guestNote: guestNote?.trim() || undefined,
      song,
      type,
      mode: paystackConfig.mode,
      status: 'initialized',
      splitRule: {
        venuePercentage: splitBreakdown.venuePercentage,
        djPercentage: splitBreakdown.djPercentage,
        platformPercentage: splitBreakdown.platformPercentage,
      },
      createdAt: new Date().toISOString(),
    });

    if (paystackConfig.isConfigured && paystackConfig.secretKey) {
      const upstreamPayload = {
        email: customerEmail,
        amount: amountKobo,
        reference,
        currency: normalizedCurrency,
        callback_url: resolvedCallbackUrl,
        ...effectivePaystackFields,
        metadata: {
          type,
          sessionId: sessionId || 'wallet-topup',
          djId: dj?.id || djId,
          djName: dj?.name,
          djAvatar: dj?.avatarUrl,
          venueId: venue?.id,
          venueName: venue?.name || dj?.currentVenue?.name,
          guestName: guestName.trim() || 'Guest',
          guestNote: guestNote?.trim() || '',
          serviceFee: dj?.liveSession?.serviceFee ?? 500,
          song,
          splitRule: {
            venuePercentage: splitBreakdown.venuePercentage,
            djPercentage: splitBreakdown.djPercentage,
            platformPercentage: splitBreakdown.platformPercentage,
          },
          splitBreakdown,
          source: 'quemydj_booth_pass',
        },
      };

      let paystackRes: Response;
      try {
        paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackConfig.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(upstreamPayload),
          signal: AbortSignal.timeout(10000),
        });
      } catch (networkErr) {
        console.error('[Paystack Initialize] Network failure contacting Paystack:', networkErr);
        return NextResponse.json(
          {
            error: 'Unable to reach Paystack payment gateway',
            mode: paystackConfig.mode,
          },
          { status: 502 }
        );
      }

      const data = (await paystackRes.json().catch(() => null)) as {
        status?: boolean;
        message?: string;
        data?: {
          authorization_url?: string;
          access_code?: string;
          reference?: string;
        };
      } | null;

      if (paystackRes.ok && data?.status && data.data?.authorization_url) {
        return NextResponse.json({
          status: 'success',
          mode: paystackConfig.mode,
          simulated: false,
          authorization_url: data.data.authorization_url,
          access_code: data.data.access_code,
          reference: data.data.reference || reference,
          routingMode,
          splitBreakdown,
          data: {
            reference: data.data.reference || reference,
            amount: amountMajor,
            amountKobo,
            currency: normalizedCurrency,
            splitBreakdown,
          },
        });
      }

      return NextResponse.json(
        {
          error:
            data?.message ||
            (paystackConfig.mode === 'live'
              ? 'Paystack live initialization failed'
              : 'Paystack test initialization failed'),
          mode: paystackConfig.mode,
        },
        { status: paystackRes.status >= 400 && paystackRes.status < 500 ? paystackRes.status : 502 }
      );
    }

    // Standard high-reliability test/simulation fallback when PAYSTACK_SECRET_KEY is not configured
    return NextResponse.json({
      status: 'success',
      mode: 'simulation',
      simulated: true,
      reference,
      authorization_url: `/requests/${reference}?simulated_payment=true`,
      access_code: `SIM-${reference.slice(-8)}`,
      routingMode,
      splitBreakdown,
      message: 'Paystack initialized successfully (Test Simulation Mode)',
      data: {
        reference,
        amount: amountMajor,
        amountKobo,
        currency: normalizedCurrency,
        song,
        splitBreakdown,
      },
    });
  } catch (err) {
    console.error('Paystack initialization error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
