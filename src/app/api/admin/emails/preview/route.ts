import { NextRequest, NextResponse } from 'next/server';
import {
  generateAdminInviteEmail,
  generateGuestReceiptEmail,
  generateDjPayoutEmail,
  generateDisputeResolutionEmail,
  generatePasswordResetEmail,
  generateDjWelcomeEmail,
  generateGuestWelcomeEmail,
} from '@/utils/emailTemplates';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const template = searchParams.get('type') || 'invite';

  switch (template) {
    case 'invite': {
      const email = generateAdminInviteEmail({
        inviteeEmail: 'director@nightclub.ng',
        roleName: 'Finance Admin',
        invitedByName: 'QueMyDJ Super Admin',
        inviteLink: 'http://localhost:3000/admin/accept-invite?token=sample_invite_token_123',
        permissionsList: ['Treasury & Settlement Ledger', 'Umpire Chamber & Escrow', 'Venues & Commission Splits'],
      });
      return new NextResponse(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    case 'receipt': {
      const email = generateGuestReceiptEmail({
        guestName: 'Alex Adebayo',
        songTitle: 'Unavailable (feat. Musa Keys)',
        artist: 'Davido',
        djName: 'DJ Spinall',
        venueName: 'Zaza Lounge Victoria Island',
        amountMajor: 10000,
        currency: 'NGN',
        reference: 'QMDJ-REQ-883921-992',
        statusUrl: 'http://localhost:3000/requests/req-883921',
        dashboardActivationUrl: 'http://localhost:3000/auth/reset-password?email=alex%40example.com',
      });
      return new NextResponse(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    case 'payout': {
      const email = generateDjPayoutEmail({
        djName: 'DJ Neptune',
        totalAmountMajor: 185000,
        currency: 'NGN',
        sessionTitle: 'Saturday Night Live Set',
        venueName: 'Club Quilox',
        splitPercentage: 70,
        destinationAccount: 'Zenith Bank •••• 4092',
        statementUrl: 'http://localhost:3000/dj/earnings',
      });
      return new NextResponse(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    case 'dispute': {
      const email = generateDisputeResolutionEmail({
        recipientName: 'Kemi Balogun',
        resolutionType: 'refund_guest',
        amountMajor: 7500,
        currency: 'NGN',
        songTitle: 'Water',
        reason: 'DJ skipped playback queue before closing set',
        arbitratorNote: 'Verified via live booth audit logs that playback was not completed.',
      });
      return new NextResponse(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    case 'password_reset': {
      const email = generatePasswordResetEmail({
        recipientName: 'DJ Neptune',
        recipientEmail: 'neptune@quemydj.com',
        resetLink: 'http://localhost:3000/auth/reset-password?email=neptune%40quemydj.com',
      });
      return new NextResponse(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    case 'welcome_dj': {
      const email = generateDjWelcomeEmail({
        djName: 'DJ Spinall',
        handle: '@spinall',
        loginUrl: 'http://localhost:3000/login?tab=dj',
      });
      return new NextResponse(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    case 'welcome_guest': {
      const email = generateGuestWelcomeEmail({
        guestName: 'Alex Adebayo',
        exploreUrl: 'http://localhost:3000/discover',
      });
      return new NextResponse(email.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    default:
      return NextResponse.json({ error: 'Unknown email template type' }, { status: 400 });
  }
}
