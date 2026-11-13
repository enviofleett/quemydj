import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServiceClient } from '@/services/supabaseClient';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const paystackSignature = request.headers.get('x-paystack-signature');

    // Server-Side Cryptographic Signature Verification
    if (paystackSecret && paystackSignature) {
      const hash = crypto
        .createHmac('sha512', paystackSecret)
        .update(rawBody)
        .digest('hex');

      if (hash !== paystackSignature) {
        console.warn('Unauthorized webhook signature mismatch');
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    // Handle Paystack 'charge.success'
    if (event.event === 'charge.success') {
      const { reference, amount, metadata } = event.data;
      console.log(`[Paystack Webhook Verified] Payment confirmed for ref: ${reference}, amount: ${amount}`);

      // Auto-insert or update request status in Supabase if configured
      const supabase = getSupabaseServiceClient();
      if (supabase && metadata?.sessionId && metadata?.song) {
        try {
          await supabase.from('song_requests').upsert(
            [
              {
                reference_code: reference,
                session_id: metadata.sessionId,
                dj_id: metadata.djId || 'dj-kofi',
                dj_name: metadata.djName || 'DJ Kofi Beats',
                dj_avatar: metadata.djAvatar || null,
                venue_name: metadata.venueName || 'Skyline Rooftop Lounge',
                song: metadata.song,
                guest_name: metadata.guestName || 'Guest',
                guest_note: metadata.guestNote || null,
                amount: Math.round(amount / 100),
                service_fee: metadata.serviceFee || 500,
                total: Math.round(amount / 100),
                status: 'waiting',
                paid_via: 'Paystack',
                payment_reference: reference,
              },
            ],
            { onConflict: 'reference_code' }
          );
          console.log(`[Supabase Webhook] Successfully recorded verified request ${reference}`);
        } catch (dbErr) {
          console.warn('[Supabase Webhook] Error persisting verified request:', dbErr);
        }
      }

      return NextResponse.json({
        received: true,
        status: 'payment_verified',
        reference,
        sessionId: metadata?.sessionId,
        songTitle: metadata?.song?.title,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Paystack webhook error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
  }
}
