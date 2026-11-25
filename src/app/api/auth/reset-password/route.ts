import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/services/supabaseClient';
import { generatePasswordResetEmail } from '@/utils/emailTemplates';
import { sendQueMyDJEmail } from '@/services/emailService';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/auth/reset-password`;

    let resetLink = `${appUrl}/auth/reset-password?email=${encodeURIComponent(cleanEmail)}`;
    let recipientName: string | undefined = undefined;

    const serviceClient = getSupabaseServiceClient();

    if (serviceClient) {
      try {
        // 1. Try to generate an official Supabase recovery link
        const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
          type: 'recovery',
          email: cleanEmail,
          options: {
            redirectTo: redirectUrl,
          },
        });

        if (!linkError && linkData?.properties?.action_link) {
          resetLink = linkData.properties.action_link;
        } else {
          // If user not in Supabase Auth, check if they exist as a DJ in djs table
          const { data: djData } = await serviceClient
            .from('djs')
            .select('name, handle')
            .eq('id', cleanEmail)
            .maybeSingle();

          if (djData?.name) {
            recipientName = djData.name;
          }
        }
      } catch (authErr) {
        console.warn('[PasswordReset] Supabase recovery generation fallback:', authErr);
      }
    }

    // Generate responsive branded HTML email
    const emailResult = generatePasswordResetEmail({
      recipientName,
      recipientEmail: cleanEmail,
      resetLink,
    });

    // Deliver via Resend
    const delivery = await sendQueMyDJEmail({
      to: cleanEmail,
      subject: emailResult.subject,
      html: emailResult.html,
    });

    console.log(`[PasswordReset] Password reset email generated for ${cleanEmail} (Delivery mode: ${delivery.mode}): ${resetLink}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated and sent.',
      resetLink,
      emailHtml: emailResult.html,
      delivery,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to process password reset';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
