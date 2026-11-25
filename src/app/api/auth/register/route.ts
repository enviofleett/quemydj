import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/services/supabaseClient';
import { generateDjWelcomeEmail, generateGuestWelcomeEmail } from '@/utils/emailTemplates';
import { sendQueMyDJEmail } from '@/services/emailService';

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const serviceClient = getSupabaseServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: 'Supabase service client not configured' },
        { status: 500 }
      );
    }

    const normalizedRole = role === 'dj' ? 'dj' : 'guest';
    const displayName = name?.trim() || (normalizedRole === 'dj' ? 'Resident DJ' : 'Club Guest');

    // Create user with email pre-confirmed so guests and resident DJs can test seamlessly
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        role: normalizedRole,
        name: displayName,
      },
    });

    if (error) {
      if (error.message?.includes('already registered') || error.code === 'user_already_exists') {
        return NextResponse.json(
          { error: 'An account with this email address already exists. Please log in.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // If registering as a DJ, automatically provision their live booth record in public.djs
    if (normalizedRole === 'dj' && data.user) {
      const slugBase = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 14) || 'dj';
      const suffix = data.user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toLowerCase();
      const handle = `@${slugBase}${suffix}`;
      const passcode = `${slugBase.slice(0, 3).toUpperCase()}${Math.floor(10 + Math.random() * 89)}`;
      const sessionId = `session-${data.user.id.slice(0, 8)}`;

      await serviceClient.from('djs').upsert(
        {
          id: data.user.id,
          name: displayName,
          handle,
          avatar_url:
            'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=300&auto=format&fit=crop&q=80',
          banner_url:
            'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1600&auto=format&fit=crop',
          bio: 'Live Resident DJ on QueMyDJ.',
          genres: ['Afrobeats', 'Amapiano', 'Hip-Hop'],
          current_venue: {
            name: 'Live Club Booth',
            city: 'Lagos',
            address: 'Main Stage',
          },
          active_session_id: sessionId,
          is_accepting_requests: true,
          base_price: 5000,
          service_fee: 500,
          passcode,
          live_session: {
            id: sessionId,
            djId: data.user.id,
            venueName: 'Live Club Booth',
            eventTitle: `${displayName} Live`,
            isAcceptingRequests: true,
            basePrice: 5000,
            serviceFee: 500,
            passcode,
            startedAt: new Date().toISOString(),
            estimatedWaitMinutes: 10,
          },
          status: 'active',
        },
        { onConflict: 'id' }
      );
    }

    // Dispatch Welcome Email asynchronously via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    (async () => {
      try {
        if (normalizedRole === 'dj') {
          const welcomeEmail = generateDjWelcomeEmail({
            djName: displayName,
            handle: `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'dj'}`,
            loginUrl: `${appUrl}/login?tab=dj`,
          });
          await sendQueMyDJEmail({
            to: email.trim().toLowerCase(),
            subject: welcomeEmail.subject,
            html: welcomeEmail.html,
          });
        } else {
          const welcomeEmail = generateGuestWelcomeEmail({
            guestName: displayName,
            exploreUrl: `${appUrl}/discover`,
          });
          await sendQueMyDJEmail({
            to: email.trim().toLowerCase(),
            subject: welcomeEmail.subject,
            html: welcomeEmail.html,
          });
        }
      } catch (mailErr) {
        console.warn('[Registration Welcome Email Warning]', mailErr);
      }
    })().catch(() => {});

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to complete registration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
