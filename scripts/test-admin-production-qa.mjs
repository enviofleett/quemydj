import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();

// Setup module resolver for TypeScript and `@/` path alias
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  let target = request;
  if (target.startsWith('@/')) {
    target = path.join(projectRoot, 'src', target.slice(2));
  }
  return originalResolveFilename.call(this, target, parent, isMain, options);
};

require.extensions['.ts'] = function compileTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
  });
  module._compile(transpiled.outputText, filename);
};

const {
  authenticateAdminUser,
  createAdminInvitation,
  acceptAdminInvitation,
  listAdminUsers,
  listAdminInvitations,
  changeAdminPassword,
  ROLE_DEFAULT_PERMISSIONS,
} = require('../src/services/adminAuthService.ts');

const {
  renderQueMyDJEmailBase,
  generateAdminInviteEmail,
  generateGuestReceiptEmail,
  generateDjPayoutEmail,
  generateDisputeResolutionEmail,
} = require('../src/utils/emailTemplates.ts');

const {
  buildPaystackSplitConfig,
  getPaystackConfig,
  verifyPaystackSignature,
} = require('../src/services/paystackService.ts');

const {
  getPlatformDefaultCommissionSplit,
  setPlatformDefaultCommissionSplit,
  calculateCommissionSplit,
} = require('../src/services/financeService.ts');

test('QA Phase 1: Admin Email & Password Authentication (No PIN)', async () => {
  // Test root super admin credentials
  const valid = await authenticateAdminUser('admin@quemydj.com', 'QueMyDJ@SuperAdmin2026!');
  assert.ok(valid.user, 'Root super admin should authenticate successfully');
  assert.equal(valid.user?.email, 'admin@quemydj.com');
  assert.equal(valid.user?.role, 'super_admin');
  assert.equal(valid.user?.permissions.treasury, true);
  assert.equal(valid.user?.permissions.manageAdmins, true);

  // Test invalid password rejection
  const invalidPass = await authenticateAdminUser('admin@quemydj.com', 'WrongPassword123');
  assert.equal(invalidPass.user, null);
  assert.equal(invalidPass.error, 'Invalid email or password');

  // Test non-existent email rejection
  const nonExistent = await authenticateAdminUser('unknown@hacker.io', 'Password123!');
  assert.equal(nonExistent.user, null);
});

test('QA Phase 2: Admin Invitation & Granular Permission Sharing', async () => {
  // Invite an Ops Admin with specific custom permissions
  const { invitation, inviteLink } = await createAdminInvitation({
    email: 'ops.director@quiloxclub.ng',
    role: 'ops_admin',
    permissions: {
      treasury: false,
      disputes: true,
      venues: true,
      djs: true,
      manageAdmins: false,
    },
    invitedBy: 'admin_root_super',
    invitedByName: 'Super Admin',
  });

  assert.ok(invitation.token, 'Should have an invitation token');
  assert.ok(inviteLink.includes(invitation.token), 'Invite link must contain the token');
  assert.equal(invitation.permissions.treasury, false);
  assert.equal(invitation.permissions.disputes, true);

  // Accept invitation and set password
  const accepted = await acceptAdminInvitation({
    token: invitation.token,
    name: 'Chidi Okonkwo',
    password: 'NewSecurePassword2026!',
  });

  assert.ok(accepted.user, 'New admin should be provisioned upon acceptance');
  assert.equal(accepted.user?.name, 'Chidi Okonkwo');
  assert.equal(accepted.user?.role, 'ops_admin');

  // Now verify that the new admin can login with email & password
  const newLogin = await authenticateAdminUser('ops.director@quiloxclub.ng', 'NewSecurePassword2026!');
  assert.ok(newLogin.user, 'Invited admin must authenticate with chosen password');
  assert.equal(newLogin.user?.permissions.disputes, true);
  assert.equal(newLogin.user?.permissions.treasury, false);
});

test('QA Phase 3: Production Branded Email Templates Generation', async () => {
  // 1. Admin Invitation Email
  const inviteEmail = generateAdminInviteEmail({
    inviteeEmail: 'director@nightclub.ng',
    roleName: 'Finance Admin',
    invitedByName: 'Super Admin',
    inviteLink: 'https://quemydj.com/admin/accept-invite?token=abc123token',
    permissionsList: ['Treasury & Ledger', 'Venues & Splits'],
  });
  assert.ok(inviteEmail.html.includes('QueMyDJ'), 'HTML must feature QueMyDJ brand');
  assert.ok(inviteEmail.html.includes('Treasury &amp; Ledger') || inviteEmail.html.includes('Treasury & Ledger'));
  assert.ok(inviteEmail.html.includes('https://quemydj.com/admin/accept-invite?token=abc123token'));

  // 2. Guest Paid Receipt Email
  const receiptEmail = generateGuestReceiptEmail({
    guestName: 'Tunde Adeleke',
    songTitle: 'Cast (feat. Odumodublvck)',
    artist: 'Shallipopi',
    djName: 'DJ Big N',
    venueName: 'Club DNA Lagos',
    amountMajor: 15000,
    currency: 'NGN',
    reference: 'QMDJ-REQ-9921',
    statusUrl: 'https://quemydj.com/requests/req-9921',
  });
  assert.ok(receiptEmail.html.includes('15,000'));
  assert.ok(receiptEmail.html.includes('Shallipopi'));
  assert.ok(receiptEmail.html.includes('Umpire Escrow'));

  // 3. DJ Payout Settlement Email
  const payoutEmail = generateDjPayoutEmail({
    djName: 'DJ Tunez',
    totalAmountMajor: 245000,
    currency: 'NGN',
    sessionTitle: 'AfroNation Live Booth',
    venueName: 'Beach Front Club',
    splitPercentage: 70,
    destinationAccount: 'Guaranty Trust Bank •••• 8821',
    statementUrl: 'https://quemydj.com/dj/earnings',
  });
  assert.ok(payoutEmail.html.includes('245,000'));
  assert.ok(payoutEmail.html.includes('Guaranty Trust Bank'));

  // 4. Dispute Resolution Email
  const disputeEmail = generateDisputeResolutionEmail({
    recipientName: 'Amina Lawal',
    resolutionType: 'refund_guest',
    amountMajor: 10000,
    currency: 'NGN',
    songTitle: 'Lonely At The Top',
    reason: 'DJ departed stage early',
    arbitratorNote: 'Logs confirmed DJ disconnected prior to queue completion.',
  });
  assert.ok(disputeEmail.html.includes('Refund Approved'));
  assert.ok(disputeEmail.html.includes('10,000'));
});

test('QA Phase 4: Paystack LIVE & Multi-Party Split Verification', async () => {
  // Test split config calculation: ₦10,000 with 70% DJ, 20% Venue, 10% Platform
  const splitResult = buildPaystackSplitConfig({
    amountMajor: 10000,
    split: { djPercentage: 70, venuePercentage: 20, platformPercentage: 10 },
    venue: {
      id: 'venue_1',
      name: 'Club Quilox',
      slug: 'quilox',
      address: 'Ozumba Mbadiwe',
      city: 'Lagos',
      ownerName: 'Shina Peller',
      ownerEmail: 'owner@quilox.ng',
      bankDetails: {},
      status: 'active',
      rating: 4.9,
      totalRevenueGenerated: 0,
      totalCommissionPaid: 0,
      paystackSubaccountCode: 'ACCT_venue_quilox_998',
      paystackSplitCode: 'SPL_quilox_split_001',
    },
    dj: {
      id: 'dj_1',
      name: 'DJ Spinall',
      handle: '@spinall',
      isAcceptingRequests: true,
      basePrice: 5000,
      genres: ['Afrobeats'],
      rating: 5,
      totalSets: 12,
      serviceFee: 500,
      currentVenue: { name: 'Club Quilox' },
      paystackSubaccountCode: 'ACCT_dj_spinall_776',
    },
  });

  // Verify exact kobo math
  assert.equal(splitResult.splitBreakdown.grossKobo, 1000000, 'Gross kobo must be 1,000,000 (₦10,000)');
  assert.equal(splitResult.splitBreakdown.djKobo, 700000, 'DJ 70% share must be 700,000 kobo (₦7,000)');
  assert.equal(splitResult.splitBreakdown.venueKobo, 200000, 'Venue 20% share must be 200,000 kobo (₦2,000)');
  assert.equal(splitResult.splitBreakdown.platformKobo, 100000, 'Platform 10% share must be 100,000 kobo (₦1,000)');

  // Verify routing preference: Valid SPL_ code routes directly to Paystack split
  assert.equal(splitResult.routingMode, 'split_code');
  assert.equal(splitResult.paystackFields.split_code, 'SPL_quilox_split_001');

  // Test dynamic multi-split when split_code is absent
  const dynamicMulti = buildPaystackSplitConfig({
    amountMajor: 10000,
    split: { djPercentage: 70, venuePercentage: 20, platformPercentage: 10 },
    venue: {
      id: 'venue_2',
      name: 'Silverbird Lounge',
      slug: 'silverbird',
      address: 'Ahmadu Bello',
      city: 'Abuja',
      ownerName: 'Ben Bruce',
      ownerEmail: 'ben@silverbird.ng',
      bankDetails: {},
      status: 'active',
      rating: 4.8,
      totalRevenueGenerated: 0,
      totalCommissionPaid: 0,
      paystackSubaccountCode: 'ACCT_venue_silverbird_331',
    },
    dj: {
      id: 'dj_2',
      name: 'DJ Cuppy',
      handle: '@cuppy',
      isAcceptingRequests: true,
      basePrice: 10000,
      genres: ['Afrobeats'],
      rating: 5,
      totalSets: 20,
      serviceFee: 500,
      currentVenue: { name: 'Silverbird Lounge' },
      paystackSubaccountCode: 'ACCT_dj_cuppy_442',
    },
  });

  assert.equal(dynamicMulti.routingMode, 'dynamic_multi_split');
  const splitField = dynamicMulti.paystackFields.split;
  assert.equal(splitField.type, 'percentage');
  assert.equal(splitField.subaccounts.length, 2);
  assert.equal(splitField.subaccounts[0].subaccount, 'ACCT_venue_silverbird_331');
  assert.equal(splitField.subaccounts[0].share, 20);
  assert.equal(splitField.subaccounts[1].subaccount, 'ACCT_dj_cuppy_442');
  assert.equal(splitField.subaccounts[1].share, 70);
});

test('QA Phase 5: Admin & User Password Change Verification', async () => {
  const targetEmail = 'admin@quemydj.com';
  const initialPassword = 'QueMyDJ@SuperAdmin2026!';
  const updatedPassword = 'NewAdminSecureKey#2026!';

  // 1. Verify changing with wrong current password fails
  const wrongAttempt = await changeAdminPassword({
    email: targetEmail,
    currentPassword: 'WrongPassword999!',
    newPassword: updatedPassword,
    requireOldPassword: true,
  });
  assert.equal(wrongAttempt.success, false);
  assert.equal(wrongAttempt.error, 'Current password does not match.');

  // 2. Verify changing with too short password fails
  const tooShortAttempt = await changeAdminPassword({
    email: targetEmail,
    currentPassword: initialPassword,
    newPassword: 'short',
    requireOldPassword: true,
  });
  assert.equal(tooShortAttempt.success, false);
  assert.ok(tooShortAttempt.error?.includes('at least 8 characters'));

  // 3. Verify successful password change
  const validChange = await changeAdminPassword({
    email: targetEmail,
    currentPassword: initialPassword,
    newPassword: updatedPassword,
    requireOldPassword: true,
  });
  assert.equal(validChange.success, true);

  // 4. Verify old password no longer works
  const oldLogin = await authenticateAdminUser(targetEmail, initialPassword);
  assert.equal(oldLogin.user, null, 'Old password must be rejected');

  // 5. Verify new password successfully authenticates
  const newLogin = await authenticateAdminUser(targetEmail, updatedPassword);
  assert.ok(newLogin.user, 'New password must authenticate successfully');
  assert.equal(newLogin.user?.email, targetEmail);

  // Revert back so standard tests stay idempotent
  await changeAdminPassword({
    email: targetEmail,
    currentPassword: updatedPassword,
    newPassword: initialPassword,
    requireOldPassword: true,
  });
});

test('QA Phase 6: Dynamic Platform Default Commission Split Setting', () => {
  const initial = getPlatformDefaultCommissionSplit();
  assert.equal(initial.djPercentage, 70);
  assert.equal(initial.venuePercentage, 20);
  assert.equal(initial.platformPercentage, 10);

  // 1. Attempt invalid split that does not sum to 100%
  const invalidAttempt = setPlatformDefaultCommissionSplit({
    djPercentage: 60,
    venuePercentage: 30,
    platformPercentage: 15, // 105%
  });
  assert.equal(invalidAttempt.success, false);
  assert.ok(invalidAttempt.error?.includes('must sum to 100%'));

  // 2. Set custom valid default: 65% DJ, 25% Venue, 10% Platform
  const validAttempt = setPlatformDefaultCommissionSplit({
    djPercentage: 65,
    venuePercentage: 25,
    platformPercentage: 10,
  });
  assert.equal(validAttempt.success, true);
  assert.equal(getPlatformDefaultCommissionSplit().djPercentage, 65);
  assert.equal(getPlatformDefaultCommissionSplit().venuePercentage, 25);

  // 3. Verify that calculateCommissionSplit without explicit split uses the updated default
  const computed = calculateCommissionSplit(10000);
  assert.equal(computed.djAmount, 6500, 'DJ should receive ₦6,500 based on new 65% default');
  assert.equal(computed.venueAmount, 2500, 'Venue should receive ₦2,500 based on new 25% default');
  assert.equal(computed.platformAmount, 1000, 'Platform should receive ₦1,000 based on 10% default');

  // 4. Verify Paystack split routing inherits the new platform default
  const paystackSplit = buildPaystackSplitConfig({
    amountMajor: 10000,
    venue: null,
    dj: null,
  });
  assert.equal(paystackSplit.splitBreakdown.djAmount, 6500);
  assert.equal(paystackSplit.splitBreakdown.venueAmount, 2500);

  // Revert back to 70/20/10 so baseline remains standard
  setPlatformDefaultCommissionSplit({
    djPercentage: 70,
    venuePercentage: 20,
    platformPercentage: 10,
  });
});
