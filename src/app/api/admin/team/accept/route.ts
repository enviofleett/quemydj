import { NextRequest, NextResponse } from 'next/server';
import { acceptAdminInvitation } from '@/services/adminAuthService';

export async function POST(req: NextRequest) {
  try {
    const { token, name, password } = await req.json();

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: 'Token, name, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const result = await acceptAdminInvitation({ token, name, password });

    if (result.error || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Failed to accept invitation' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'Admin account successfully established. You may now log in.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error processing invite acceptance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
