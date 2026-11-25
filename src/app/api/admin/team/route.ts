import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminInvitation,
  listAdminInvitations,
  listAdminUsers,
  AdminRole,
  AdminPermissions,
} from '@/services/adminAuthService';
import { generateAdminInviteEmail } from '@/utils/emailTemplates';
import { sendQueMyDJEmail } from '@/services/emailService';

export async function GET(req: NextRequest) {
  try {
    const [admins, invitations] = await Promise.all([
      listAdminUsers(),
      listAdminInvitations(),
    ]);

    return NextResponse.json({
      success: true,
      admins,
      invitations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch admin users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, role, permissions, invitedBy, invitedByName } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { invitation, inviteLink } = await createAdminInvitation({
      email,
      role: (role as AdminRole) || 'ops_admin',
      permissions: permissions as Partial<AdminPermissions>,
      invitedBy: invitedBy || 'super_admin',
      invitedByName: invitedByName || 'Super Admin',
    });

    // Map permissions to readable array for email
    const permLabels: string[] = [];
    if (invitation.permissions.treasury) permLabels.push('Treasury & Settlement Ledger');
    if (invitation.permissions.disputes) permLabels.push('Umpire Chamber & Escrow Disputes');
    if (invitation.permissions.venues) permLabels.push('Venues & Split Management');
    if (invitation.permissions.djs) permLabels.push('DJ Roster & Live Booths');
    if (invitation.permissions.manageAdmins) permLabels.push('Officer Management & Permissions');

    // Generate branded email and deliver via Resend
    const inviteEmail = generateAdminInviteEmail({
      inviteeEmail: email,
      roleName: invitation.role === 'super_admin' ? 'Super Administrator' : invitation.role === 'finance_admin' ? 'Finance Officer' : 'Operations Officer',
      invitedByName: invitation.invitedByName,
      inviteLink,
      permissionsList: permLabels.length > 0 ? permLabels : ['Standard Executive Access'],
    });

    const delivery = await sendQueMyDJEmail({
      to: email,
      subject: inviteEmail.subject,
      html: inviteEmail.html,
    });

    return NextResponse.json({
      success: true,
      invitation,
      inviteLink,
      delivery,
      message: `Invitation generated and dispatched to ${email}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create invitation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
