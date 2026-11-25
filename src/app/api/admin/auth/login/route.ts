import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminUser } from '@/services/adminAuthService';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await authenticateAdminUser(email, password);

    if (result.error || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Invalid credentials' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
