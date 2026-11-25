import { NextRequest, NextResponse } from 'next/server';
import { listSongRequests, updateSongRequest, recordWalletTransaction, getDjById } from '@/services/serverDataStore';
import { sendQueMyDJEmail } from '@/services/emailService';

// Auto-override window in milliseconds (1 hour = 3600 * 1000)
const DEFAULT_AUTO_OVERRIDE_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { maxAgeMs = DEFAULT_AUTO_OVERRIDE_MS } = await request.json().catch(() => ({}));
    const requests = await listSongRequests();
    const now = Date.now();

    const playedUnverified = requests.filter((r) => {
      if (r.status !== 'played') return false;
      if (r.feedbackGiven) return false; // Already verified or reported
      const updatedAtMs = new Date(r.updatedAt || r.createdAt).getTime();
      return now - updatedAtMs >= maxAgeMs;
    });

    const overrides = [];

    for (const req of playedUnverified) {
      // 1. Mark request as auto-overridden / auto-verified
      const updated = await updateSongRequest(req.id, {
        feedbackGiven: 'played_confirmed',
        feedbackNote: 'Auto-overridden: 1-hour verification window elapsed without customer dispute.',
      });

      // 2. Deposit funds into DJ wallet ledger
      await recordWalletTransaction({
        reference: `auto-override-${req.id}-${Date.now().toString(36)}`,
        idempotencyKey: `auto-override:${req.id}`,
        type: 'dj_settlement',
        direction: 'credit',
        amount: req.amount,
        djId: req.djId,
        venueId: req.venueId,
        requestId: req.id,
        description: `Auto-Released Song Payout: ${req.song?.title || req.id} (1h guest verification override)`,
        metadata: {
          overriddenAt: new Date().toISOString(),
          originalTotal: req.total,
          djShare: req.amount,
        },
      });

      // 3. Notify customer via email if email available
      if (req.paymentReference) {
        // Send notification email asynchronously
        sendQueMyDJEmail({
          to: req.guestName?.includes('@') ? req.guestName : 'experience@quemydj.com',
          subject: `Request Complete: "${req.song?.title}" auto-verified by QueMyDJ`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #111;">
              <h2>QueMyDJ Live Session Update</h2>
              <p>Hi ${req.guestName || 'Valued Guest'},</p>
              <p>Your song request for <strong>"${req.song?.title}"</strong> by ${req.song?.artist} was marked played by <strong>${req.djName}</strong>.</p>
              <p>Because the 1-hour verification window has elapsed without any issue reported, the payout has been confirmed and deposited to the DJ's balance.</p>
              <p>Thank you for partying with us!</p>
            </div>
          `,
        }).catch((err) => console.warn('[Auto-Override Email Error]', err));
      }

      overrides.push({
        requestId: req.id,
        song: req.song?.title,
        djName: req.djName,
        amount: req.amount,
      });
    }

    return NextResponse.json({
      success: true,
      overriddenCount: overrides.length,
      overrides,
    });
  } catch (err) {
    console.error('[Auto-Override API Error]', err);
    return NextResponse.json({ error: 'Failed to process auto-overrides' }, { status: 500 });
  }
}

export async function GET() {
  return POST(new NextRequest('http://localhost:3000/api/requests/auto-override', { method: 'POST' }));
}
