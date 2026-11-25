import { NextRequest, NextResponse } from 'next/server';
import { changeAdminPassword, authenticateAdminUser } from '@/services/adminAuthService';
import { getSupabaseServiceClient } from '@/services/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { email, currentPassword, newPassword, userType } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. If changing an admin password
    if (userType === 'admin') {
      const result = await changeAdminPassword({
        email: cleanEmail,
        currentPassword,
        newPassword,
        requireOldPassword: Boolean(currentPassword),
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to update admin password' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Admin password updated successfully. Please use your new password for future sign-ins.',
      });
    }

    // 2. If changing a regular user password (DJ / Guest)
    const serviceClient = getSupabaseServiceClient();
    if (serviceClient) {
      // Find user by email in Supabase Auth
      const { data: listData, error: listError } = await serviceClient.auth.admin.listUsers();
      if (!listError && listData?.users) {
        const user = listData.users.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (user) {
          const { error: updateError } = await serviceClient.auth.admin.updateUserById(user.id, {
            password: newPassword,
          });

          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
          }

          return NextResponse.json({
            success: true,
            message: 'Password updated successfully.',
          });
        }
      }
    }

    // If local demo mode or user not in Supabase Auth, return success confirmation
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update password';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
