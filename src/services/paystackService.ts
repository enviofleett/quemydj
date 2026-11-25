import crypto from 'crypto';
import { ClubVenue, DJ, Song, SongRequest, VenueCommissionSplit } from '@/types';
import {
  calculateCommissionSplit,
  DEFAULT_COMMISSION_SPLIT,
  getPlatformDefaultCommissionSplit,
  SplitBreakdown,
  validateCommissionSplit,
} from './financeService';
import {
  findVenueForContext,
  getDjById,
  getPaymentIntent,
  getSongRequestByIdOrRef,
  hasProcessedPaymentReference,
  markPaymentReferenceProcessed,
  recordWalletTransaction,
  upsertSongRequest,
} from './serverDataStore';
import { generateGuestReceiptEmail } from '@/utils/emailTemplates';
import { sendQueMyDJEmail } from './emailService';
import { getSupabaseServiceClient } from './supabaseClient';

export type PaystackMode = 'live' | 'test' | 'simulation';

export interface PaystackConfig {
  secretKey: string | null;
  mode: PaystackMode;
  isConfigured: boolean;
}

const PLACEHOLDER_TOKENS = ['placeholder', 'sample', 'your_key', 'your-key', 'changeme'];

export function getPaystackConfig(): PaystackConfig {
  const raw = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!raw) {
    return { secretKey: null, mode: 'simulation', isConfigured: false };
  }
  const lower = raw.toLowerCase();
  if (PLACEHOLDER_TOKENS.some((token) => lower.includes(token))) {
    return { secretKey: null, mode: 'simulation', isConfigured: false };
  }

  const mode: PaystackMode = raw.startsWith('sk_live_') || raw.startsWith('rk_live_') ? 'live' : 'test';
  return { secretKey: raw, mode, isConfigured: true };
}

/**
 * Constant-time HMAC-SHA512 webhook signature verification.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
  secretKey: string
): boolean {
  if (!signature || !secretKey) return false;
  const normalizedSig = signature.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(normalizedSig)) return false;

  const expectedHex = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const actualBuf = Buffer.from(normalizedSig, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function buildPaystackSplitConfig(params: {
  amountMajor: number;
  tipMajor?: number;
  currency?: string;
  split?: VenueCommissionSplit;
  venue?: ClubVenue | null;
  dj?: DJ | null;
  overrideSplitCode?: string;
  overrideVenueSubaccount?: string;
  overrideDjSubaccount?: string;
}): {
  splitBreakdown: SplitBreakdown;
  paystackFields: Record<string, unknown>;
  routingMode: 'split_code' | 'dynamic_multi_split' | 'single_subaccount' | 'platform_escrow';
} {
  const splitRule =
    params.split && validateCommissionSplit(params.split).valid
      ? params.split
      : params.venue?.commissionSplit || getPlatformDefaultCommissionSplit();

  const splitBreakdown = calculateCommissionSplit(params.amountMajor, splitRule, params.tipMajor || 0);

  const splitCode =
    params.overrideSplitCode ||
    params.venue?.paystackSplitCode ||
    process.env.PAYSTACK_PLATFORM_SPLIT_CODE?.trim();

  const venueSub =
    params.overrideVenueSubaccount ||
    params.venue?.paystackSubaccountCode ||
    process.env.PAYSTACK_DEFAULT_VENUE_SUBACCOUNT?.trim();

  const djSub =
    params.overrideDjSubaccount ||
    params.dj?.paystackSubaccountCode ||
    process.env.PAYSTACK_DEFAULT_DJ_SUBACCOUNT?.trim();

  const isValidSplitCode = (code?: string) => Boolean(code && code.startsWith('SPL_'));
  const isValidSubaccount = (code?: string) => Boolean(code && code.startsWith('ACCT_'));

  if (isValidSplitCode(splitCode)) {
    return {
      splitBreakdown,
      routingMode: 'split_code',
      paystackFields: { split_code: splitCode },
    };
  }

  if (isValidSubaccount(venueSub) && isValidSubaccount(djSub)) {
    return {
      splitBreakdown,
      routingMode: 'dynamic_multi_split',
      paystackFields: {
        split: {
          type: 'percentage',
          currency: (params.currency || 'NGN').toUpperCase(),
          subaccounts: [
            { subaccount: venueSub, share: splitRule.venuePercentage },
            { subaccount: djSub, share: splitRule.djPercentage },
          ],
          bearer_type: 'account',
        },
      },
    };
  }

  const singleSub = isValidSubaccount(djSub) ? djSub : isValidSubaccount(venueSub) ? venueSub : undefined;
  if (singleSub) {
    const subShareKobo = isValidSubaccount(djSub) ? splitBreakdown.djKobo : splitBreakdown.venueKobo;
    const platformRetentionKobo = Math.max(0, splitBreakdown.grossKobo - subShareKobo);
    return {
      splitBreakdown,
      routingMode: 'single_subaccount',
      paystackFields: {
        subaccount: singleSub,
        transaction_charge: platformRetentionKobo,
        bearer: 'account',
      },
    };
  }

  return {
    splitBreakdown,
    routingMode: 'platform_escrow',
    paystackFields: {},
  };
}

export interface ConfirmPaymentInput {
  reference: string;
  amountKobo: number;
  currency?: string;
  channel?: string;
  customerEmail?: string;
  paidAt?: string;
  source: 'webhook' | 'verify_endpoint';
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
}

export interface ConfirmPaymentResult {
  idempotent: boolean;
  alreadyProcessed: boolean;
  reference: string;
  amountMajor: number;
  currency: string;
  splitBreakdown: SplitBreakdown;
  request: SongRequest | null;
}

/**
 * Idempotently confirms a verified Paystack transaction, upserts the song request if present,
 * and records ledger entries in wallet_transactions.
 */
export async function confirmPaystackPayment(
  input: ConfirmPaymentInput
): Promise<ConfirmPaymentResult> {
  const { reference, amountKobo, currency = 'NGN', source } = input;
  const intent = getPaymentIntent(reference);

  const meta = {
    type: input.metadata?.type || intent?.type || 'song_request',
    sessionId: input.metadata?.sessionId || intent?.sessionId,
    djId: input.metadata?.djId || intent?.djId || 'dj-kofi',
    djName: input.metadata?.djName,
    djAvatar: input.metadata?.djAvatar,
    venueId: input.metadata?.venueId || intent?.venueId,
    venueName: input.metadata?.venueName,
    guestName: input.metadata?.guestName || intent?.guestName || 'Guest',
    guestNote: input.metadata?.guestNote || intent?.guestNote,
    serviceFee: input.metadata?.serviceFee,
    song: input.metadata?.song || intent?.song,
    splitRule: input.metadata?.splitRule || intent?.splitRule,
  };

  const amountMajor = Math.round(amountKobo / 100);
  const dj = await getDjById(meta.djId);
  const venue = await findVenueForContext({
    venueId: meta.venueId,
    venueName: meta.venueName || dj?.currentVenue?.name,
    djId: dj?.id,
  });

  const activeSplit =
    meta.splitRule && validateCommissionSplit(meta.splitRule).valid
      ? meta.splitRule
      : venue?.commissionSplit || getPlatformDefaultCommissionSplit();
  const tipMajor = Number((input.metadata as any)?.tip || intent?.tip || 0);
  const splitBreakdown = calculateCommissionSplit(amountMajor, activeSplit, tipMajor);

  const alreadyDone = await hasProcessedPaymentReference(reference);
  if (alreadyDone) {
    const existingReq = await getSongRequestByIdOrRef(reference);
    return {
      idempotent: true,
      alreadyProcessed: true,
      reference,
      amountMajor,
      currency,
      splitBreakdown,
      request: existingReq,
    };
  }

  let savedRequest: SongRequest | null = null;
  if (meta.type !== 'wallet_topup' && meta.sessionId && meta.song) {
    const serviceFee = Number(meta.serviceFee ?? dj?.liveSession?.serviceFee ?? 500);
    const requestAmount = Math.max(0, amountMajor - serviceFee);
    const now = new Date().toISOString();
    const requestId = crypto.randomUUID();

    savedRequest = await upsertSongRequest({
      id: requestId,
      referenceCode: reference,
      sessionId: meta.sessionId,
      venueId: venue?.id,
      djId: dj?.id || meta.djId,
      djName: meta.djName || dj?.name || 'DJ Kofi Beats',
      djAvatar: meta.djAvatar || dj?.avatarUrl || '',
      venueName: meta.venueName || venue?.name || dj?.currentVenue?.name || 'Skyline Rooftop Lounge',
      song: meta.song,
      guestName: meta.guestName,
      guestNote: meta.guestNote,
      amount: requestAmount,
      serviceFee,
      total: amountMajor,
      currency,
      status: 'waiting',
      paidVia: 'Paystack',
      paymentReference: reference,
      paymentVerifiedServerSide: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await recordWalletTransaction({
    reference,
    idempotencyKey: `paystack-confirm:${reference}`,
    type: meta.type === 'wallet_topup' ? 'topup' : 'request_payment',
    direction: 'credit',
    amount: amountMajor,
    venueId: venue?.id,
    djId: dj?.id || meta.djId,
    requestId: savedRequest?.id,
    provider: 'paystack',
    providerReference: reference,
    description:
      meta.type === 'wallet_topup'
        ? `Paystack Wallet Top-Up (${reference})`
        : `Paystack Song Request: ${meta.song?.title || reference}`,
    metadata: {
      source,
      channel: input.channel || 'card',
      customerEmail: input.customerEmail || intent?.email,
      paidAt: input.paidAt || new Date().toISOString(),
      splitBreakdown,
    },
  });

  markPaymentReferenceProcessed(reference, source, {
    amountMajor,
    currency,
    splitBreakdown,
  });

  // Dispatch receipt email asynchronously via Resend
  const guestEmail = input.customerEmail || intent?.email;
  if (guestEmail && guestEmail.includes('@') && savedRequest && meta.type !== 'wallet_topup') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Asynchronously create / generate user password creation link and dispatch receipt
    (async () => {
      let dashboardActivationUrl = `${appUrl}/auth/reset-password?email=${encodeURIComponent(guestEmail)}`;
      
      const serviceClient = getSupabaseServiceClient();
      if (serviceClient) {
        try {
          // Check or generate Supabase recovery onboarding link
          const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
            type: 'recovery',
            email: guestEmail.toLowerCase().trim(),
            options: {
              redirectTo: `${appUrl}/auth/reset-password`,
            },
          });

          if (!linkError && linkData?.properties?.action_link) {
            dashboardActivationUrl = linkData.properties.action_link;
          } else if (linkError?.message?.includes('User with this email not found')) {
            // Provision guest in Supabase Auth so they can immediately set their password
            const tempPassword = `GuestPass_${Date.now()}!`;
            const { data: newUserData } = await serviceClient.auth.admin.createUser({
              email: guestEmail.toLowerCase().trim(),
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                name: savedRequest.guestName || 'Club Guest',
                role: 'guest',
              },
            });

            if (newUserData?.user) {
              const { data: recoveryData } = await serviceClient.auth.admin.generateLink({
                type: 'recovery',
                email: guestEmail.toLowerCase().trim(),
                options: {
                  redirectTo: `${appUrl}/auth/reset-password`,
                },
              });
              if (recoveryData?.properties?.action_link) {
                dashboardActivationUrl = recoveryData.properties.action_link;
              }
            }
          }
        } catch (authErr) {
          console.warn('[Paystack Provisioning Error]', authErr);
        }
      }

      try {
        const receiptTpl = generateGuestReceiptEmail({
          guestName: savedRequest.guestName || 'Valued Guest',
          songTitle: savedRequest.song.title,
          artist: savedRequest.song.artist,
          djName: dj?.name || 'Resident DJ',
          venueName: venue?.name || 'Live Venue',
          amountMajor,
          currency,
          reference,
          statusUrl: `${appUrl}/requests/${savedRequest.id}`,
          dashboardActivationUrl,
        });

        await sendQueMyDJEmail({
          to: guestEmail,
          subject: receiptTpl.subject,
          html: receiptTpl.html,
        });
      } catch (err) {
        console.warn('[Paystack Receipt Email Error]', err);
      }
    })().catch((err) => console.warn('[Paystack Background Task Error]', err));
  }

  return {
    idempotent: false,
    alreadyProcessed: false,
    reference,
    amountMajor,
    currency,
    splitBreakdown,
    request: savedRequest,
  };
}

export async function initiatePaystackRefund(
  reference: string,
  amountMajor?: number,
  reason?: string
): Promise<{
  refunded: boolean;
  mode: PaystackMode;
  refundReference: string;
  message: string;
}> {
  const { secretKey, mode, isConfigured } = getPaystackConfig();
  const fallbackRef = `RFND-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (!isConfigured || !secretKey) {
    return {
      refunded: true,
      mode: 'simulation',
      refundReference: fallbackRef,
      message: 'Refund processed via local escrow ledger (Paystack simulation mode).',
    };
  }

  try {
    const body: Record<string, unknown> = {
      transaction: reference,
      merchant_note: reason || 'QueMyDJ Umpire Dispute Refund',
    };
    if (amountMajor && amountMajor > 0) {
      body.amount = Math.round(amountMajor * 100);
    }

    const res = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    const data = (await res.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: { id?: number | string; status?: string };
    } | null;

    if (res.ok && data?.status) {
      return {
        refunded: true,
        mode,
        refundReference: data.data?.id ? `PS-RFND-${data.data.id}` : fallbackRef,
        message: data.message || 'Paystack refund initiated successfully.',
      };
    }

    // In test mode, external test reference may not exist at Paystack; record ledger refund gracefully
    if (mode === 'test') {
      return {
        refunded: true,
        mode: 'test',
        refundReference: fallbackRef,
        message: data?.message || 'Test-mode refund recorded on internal escrow ledger.',
      };
    }

    return {
      refunded: false,
      mode,
      refundReference: fallbackRef,
      message: data?.message || 'Paystack refund API returned an error.',
    };
  } catch (err) {
    console.warn('[Paystack Refund] Upstream call error:', err);
    return {
      refunded: mode !== 'live',
      mode,
      refundReference: fallbackRef,
      message:
        mode === 'live'
          ? 'Network error contacting Paystack refund endpoint.'
          : 'Simulated/test refund recorded after network fallback.',
    };
  }
}
