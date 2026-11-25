import { getSupabaseServiceClient } from './supabaseClient';
import crypto from 'crypto';

export type AdminRole = 'super_admin' | 'finance_admin' | 'umpire_admin' | 'ops_admin' | 'viewer';

export interface AdminPermissions {
  treasury: boolean;
  disputes: boolean;
  venues: boolean;
  djs: boolean;
  manageAdmins: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermissions;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
  invitedBy?: string;
  status: 'active' | 'suspended';
}

export interface AdminInvitation {
  id: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermissions;
  token: string;
  invitedBy: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'revoked';
}

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  super_admin: {
    treasury: true,
    disputes: true,
    venues: true,
    djs: true,
    manageAdmins: true,
  },
  finance_admin: {
    treasury: true,
    disputes: true,
    venues: true,
    djs: false,
    manageAdmins: false,
  },
  umpire_admin: {
    treasury: false,
    disputes: true,
    venues: false,
    djs: true,
    manageAdmins: false,
  },
  ops_admin: {
    treasury: false,
    disputes: false,
    venues: true,
    djs: true,
    manageAdmins: false,
  },
  viewer: {
    treasury: true,
    disputes: true,
    venues: true,
    djs: true,
    manageAdmins: false,
  },
};

// In-memory persistent fallback if admin_users or admin_invitations table does not exist yet in Supabase
const memoryAdminUsers: Map<string, AdminUser & { passwordHash: string; salt: string }> = new Map();
const memoryInvitations: Map<string, AdminInvitation> = new Map();

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

// Seed root super admin in memory so login works immediately even before DB migration
function seedRootSuperAdmin() {
  const rootEmail = (process.env.ADMIN_ROOT_EMAIL || 'admin@quemydj.com').toLowerCase().trim();
  const rootPassword = process.env.ADMIN_ROOT_PASSWORD || 'QueMyDJ@SuperAdmin2026!';
  const salt = 'quemydj_root_salt_secure_2026';
  const passwordHash = hashPassword(rootPassword, salt);

  if (!memoryAdminUsers.has(rootEmail)) {
    memoryAdminUsers.set(rootEmail, {
      id: 'admin_root_super',
      email: rootEmail,
      name: 'Super Admin',
      role: 'super_admin',
      permissions: ROLE_DEFAULT_PERMISSIONS.super_admin,
      createdAt: new Date().toISOString(),
      status: 'active',
      salt,
      passwordHash,
    });
  }
}
seedRootSuperAdmin();

/**
 * Authenticates an admin using email and password.
 * Uses Supabase Auth if configured, or falls back to secure pbkdf2 storage.
 */
export async function authenticateAdminUser(
  email: string,
  pass: string
): Promise<{ user: AdminUser | null; token?: string; error?: string }> {
  seedRootSuperAdmin();
  const cleanEmail = email.toLowerCase().trim();
  const service = getSupabaseServiceClient();

  // 1. Try Supabase Auth first
  if (service) {
    try {
      const { data: signInData, error: signInError } = await service.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (!signInError && signInData?.user) {
        // Query user metadata or admin table
        const { data: dbAdmin } = await service
          .from('admin_users')
          .select('*')
          .eq('email', cleanEmail)
          .single();

        const role = (dbAdmin?.role || signInData.user.user_metadata?.role || 'super_admin') as AdminRole;
        const perms: AdminPermissions = dbAdmin?.permissions || signInData.user.user_metadata?.permissions || ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.super_admin;

        const adminUser: AdminUser = {
          id: signInData.user.id,
          email: cleanEmail,
          name: dbAdmin?.name || signInData.user.user_metadata?.name || 'Administrator',
          role,
          permissions: perms,
          createdAt: signInData.user.created_at,
          lastLoginAt: new Date().toISOString(),
          status: 'active',
        };

        return { user: adminUser, token: signInData.session?.access_token };
      }
    } catch {
      // Supabase signInWithPassword threw or table absent, fallback to local memory check
    }
  }

  // 2. Fallback to memory store
  const stored = memoryAdminUsers.get(cleanEmail);
  if (!stored) {
    return { user: null, error: 'Invalid email or password' };
  }

  if (stored.status !== 'active') {
    return { user: null, error: 'This admin account has been suspended' };
  }

  const computedHash = hashPassword(pass, stored.salt);
  if (computedHash !== stored.passwordHash) {
    return { user: null, error: 'Invalid email or password' };
  }

  stored.lastLoginAt = new Date().toISOString();
  const { passwordHash: _, salt: __, ...user } = stored;
  return { user, token: `local_token_${user.id}_${Date.now()}` };
}

/**
 * Register or invite a new admin user
 */
export async function createAdminInvitation(params: {
  email: string;
  role: AdminRole;
  permissions?: Partial<AdminPermissions>;
  invitedBy: string;
  invitedByName: string;
}): Promise<{ invitation: AdminInvitation; inviteLink: string }> {
  const cleanEmail = params.email.toLowerCase().trim();
  const role = params.role || 'ops_admin';
  const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role];
  const permissions: AdminPermissions = {
    ...defaultPerms,
    ...(params.permissions || {}),
  };

  const token = crypto.randomBytes(32).toString('hex');
  const invitation: AdminInvitation = {
    id: `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: cleanEmail,
    role,
    permissions,
    token,
    invitedBy: params.invitedBy,
    invitedByName: params.invitedByName,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    status: 'pending',
  };

  const service = getSupabaseServiceClient();
  if (service) {
    try {
      await service.from('admin_invitations').insert({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        permissions: invitation.permissions,
        token: invitation.token,
        invited_by: invitation.invitedBy,
        invited_by_name: invitation.invitedByName,
        created_at: invitation.createdAt,
        expires_at: invitation.expiresAt,
        status: invitation.status,
      });
    } catch {
      // Table absent, fallback to memory
    }
  }

  memoryInvitations.set(token, invitation);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteLink = `${baseUrl}/admin/accept-invite?token=${token}`;

  return { invitation, inviteLink };
}

/**
 * Accepts an invitation and provisions an admin user with password
 */
export async function acceptAdminInvitation(params: {
  token: string;
  name: string;
  password: string;
}): Promise<{ user: AdminUser | null; error?: string }> {
  const service = getSupabaseServiceClient();
  let invite: AdminInvitation | undefined;

  if (service) {
    try {
      const { data } = await service
        .from('admin_invitations')
        .select('*')
        .eq('token', params.token)
        .eq('status', 'pending')
        .single();
      if (data) {
        invite = {
          id: data.id,
          email: data.email,
          role: data.role,
          permissions: data.permissions,
          token: data.token,
          invitedBy: data.invited_by,
          invitedByName: data.invited_by_name,
          createdAt: data.created_at,
          expiresAt: data.expires_at,
          status: data.status,
        };
      }
    } catch {}
  }

  if (!invite) {
    invite = memoryInvitations.get(params.token);
  }

  if (!invite) {
    return { user: null, error: 'Invitation not found or has expired' };
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return { user: null, error: 'Invitation link has expired. Request a new invite from Super Admin.' };
  }

  const cleanEmail = invite.email.toLowerCase().trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(params.password, salt);

  const newUser: AdminUser = {
    id: `admin_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: cleanEmail,
    name: params.name.trim(),
    role: invite.role,
    permissions: invite.permissions,
    createdAt: new Date().toISOString(),
    invitedBy: invite.invitedBy,
    status: 'active',
  };

  // Create in Supabase Auth if service is present
  if (service) {
    try {
      await service.auth.admin.createUser({
        email: cleanEmail,
        password: params.password,
        email_confirm: true,
        user_metadata: {
          name: newUser.name,
          role: newUser.role,
          permissions: newUser.permissions,
        },
      });

      await service.from('admin_users').upsert({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        permissions: newUser.permissions,
        created_at: newUser.createdAt,
        status: newUser.status,
      });

      await service
        .from('admin_invitations')
        .update({ status: 'accepted' })
        .eq('token', params.token);
    } catch {}
  }

  memoryAdminUsers.set(cleanEmail, {
    ...newUser,
    passwordHash,
    salt,
  });

  invite.status = 'accepted';
  memoryInvitations.set(params.token, invite);

  return { user: newUser };
}

/**
 * List all admin users
 */
export async function listAdminUsers(): Promise<AdminUser[]> {
  seedRootSuperAdmin();
  const service = getSupabaseServiceClient();
  if (service) {
    try {
      const { data } = await service.from('admin_users').select('*');
      if (data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          email: d.email,
          name: d.name,
          role: d.role,
          permissions: d.permissions,
          createdAt: d.created_at,
          lastLoginAt: d.last_login_at,
          status: d.status,
        }));
      }
    } catch {}
  }

  return Array.from(memoryAdminUsers.values()).map(({ passwordHash: _, salt: __, ...user }) => user);
}

/**
 * Change an admin user's password verifying old password or performing administrative reset.
 */
export async function changeAdminPassword(params: {
  email: string;
  currentPassword?: string;
  newPassword: string;
  requireOldPassword?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  seedRootSuperAdmin();
  const cleanEmail = params.email.toLowerCase().trim();
  const service = getSupabaseServiceClient();

  if (params.newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }

  // 1. If verifying old password in memory
  const stored = memoryAdminUsers.get(cleanEmail);
  if (params.requireOldPassword && params.currentPassword) {
    if (stored) {
      const oldHash = hashPassword(params.currentPassword, stored.salt);
      if (oldHash !== stored.passwordHash) {
        return { success: false, error: 'Current password does not match.' };
      }
    }
  }

  // 2. Update via Supabase Auth if service is active
  if (service) {
    try {
      // Find user id by email
      const { data: usersData } = await service.auth.admin.listUsers();
      const user = usersData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (user) {
        const { error } = await service.auth.admin.updateUserById(user.id, {
          password: params.newPassword,
        });
        if (error) {
          console.warn('[AdminAuth] Supabase update password error:', error);
        }
      }
    } catch (err) {
      console.warn('[AdminAuth] Supabase service update user failed:', err);
    }
  }

  // 3. Update memory store
  if (stored) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(params.newPassword, salt);
    stored.salt = salt;
    stored.passwordHash = passwordHash;
    memoryAdminUsers.set(cleanEmail, stored);
    return { success: true };
  }

  // If was not in memory, seed into memory with new password
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(params.newPassword, salt);
  memoryAdminUsers.set(cleanEmail, {
    id: `admin_${Date.now()}`,
    email: cleanEmail,
    name: cleanEmail.split('@')[0],
    role: 'super_admin',
    permissions: ROLE_DEFAULT_PERMISSIONS.super_admin,
    createdAt: new Date().toISOString(),
    status: 'active',
    salt,
    passwordHash,
  });

  return { success: true };
}

/**
 * List pending admin invitations
 */
export async function listAdminInvitations(): Promise<AdminInvitation[]> {
  const service = getSupabaseServiceClient();
  if (service) {
    try {
      const { data } = await service.from('admin_invitations').select('*').eq('status', 'pending');
      if (data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          email: d.email,
          role: d.role,
          permissions: d.permissions,
          token: d.token,
          invitedBy: d.invited_by,
          invitedByName: d.invited_by_name,
          createdAt: d.created_at,
          expiresAt: d.expires_at,
          status: d.status,
        }));
      }
    } catch {}
  }

  return Array.from(memoryInvitations.values()).filter((i) => i.status === 'pending');
}
