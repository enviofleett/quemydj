/**
 * QueMyDJ Production Branded Email Templates
 * Responsive, bulletproof HTML email layouts designed with QueMyDJ branding and logo styling.
 */

// Production hosted CDN logo URL (Gmail, Apple Mail, Outlook, and webmail friendly)
const HOSTED_BRAND_LOGO_URL = 'https://www.quemydj.com/brand-logo-transparent.png';

export interface EmailLayoutOptions {
  recipientName?: string;
  preheader?: string;
  headline: string;
  introText: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryNote?: string;
}

export interface EditableEmailTemplate {
  id: 'invite' | 'receipt' | 'payout' | 'dispute' | 'password_reset' | 'welcome_dj' | 'welcome_guest';
  name: string;
  description: string;
  subjectPattern: string;
  headline: string;
  introText: string;
  ctaText: string;
  secondaryNote: string;
}

export const DEFAULT_EMAIL_TEMPLATES: Record<string, EditableEmailTemplate> = {
  welcome_dj: {
    id: 'welcome_dj',
    name: 'DJ Onboarding & Welcome',
    description: 'Sent when a resident or touring DJ registers their booth on QueMyDJ.',
    subjectPattern: 'Welcome to the Booth, {{djName}}! Your QueMyDJ Console is Live',
    headline: 'Welcome to QueMyDJ Resident DJ Network',
    introText: 'Congratulations on launching your digital DJ booth! With QueMyDJ, you take direct control over crowd music requests, protect your set flow, and earn guaranteed tips settled straight to your bank account.',
    ctaText: 'Open DJ Workstation & Go Live',
    secondaryNote: 'Next Steps: Connect your Paystack bank account in Settings to receive automatic session disbursements, and download your high-resolution booth QR code to place on your stage table.',
  },
  welcome_guest: {
    id: 'welcome_guest',
    name: 'Club Guest Onboarding & Welcome',
    description: 'Sent when a club guest creates an account or completes their first song request.',
    subjectPattern: 'Welcome to QueMyDJ — Power the Club Vibe!',
    headline: 'Welcome to QueMyDJ Social Music Network',
    introText: 'You now have full VIP access to power the music at top clubs and lounges! Request your favorite jams directly to the resident DJ, send custom stage shoutouts, and enjoy instant 100% money-back escrow protection.',
    ctaText: 'Explore Live Clubs & DJs',
    secondaryNote: 'Club Night Tip: Top up your Club Night Wallet anytime to request jams with 1-tap all night long without authorizing bank cards over and over.',
  },
  password_reset: {
    id: 'password_reset',
    name: 'Password Reset Request',
    description: 'Sent when a DJ or Guest requests to reset and change their account password.',
    subjectPattern: 'Reset Your QueMyDJ Password',
    headline: 'Reset Your Account Password',
    introText: 'We received a request to change the password for your QueMyDJ account. Click the button below to enter your new password.',
    ctaText: 'Choose New Password & Sign In',
    secondaryNote: 'Security Notice: If you did not make this request, you can safely ignore this email. Your password will remain unchanged. This reset link will expire in 2 hours.',
  },
  invite: {
    id: 'invite',
    name: 'Admin Console Invitation',
    description: 'Sent when an administrator invites a new officer or partner to the executive command center.',
    subjectPattern: 'Welcome to QueMyDJ Executive Console — {{role}} Access',
    headline: 'Welcome to QueMyDJ Executive Operations',
    introText: '{{invitedBy}} has granted you executive clearance to join the QueMyDJ administrative command center. From your console, you can oversee live stage transactions, monitor automated Paystack revenue splits, and manage venue operations seamlessly.',
    ctaText: 'Activate Executive Access & Set Password',
    secondaryNote: 'Confidentiality Notice: This administrative activation token is encrypted and strictly intended for the designated recipient. It expires automatically in 7 days. If you did not request this access, please notify security@quemydj.com immediately.',
  },
  receipt: {
    id: 'receipt',
    name: 'Guest Song Request Receipt',
    description: 'Sent to guests immediately after a successful Paystack payment for their song request.',
    subjectPattern: 'Your Song Request is Live in the Booth! — "{{songTitle}}" (Ref: {{reference}})',
    headline: 'Your Song Request is Locked & Queued',
    introText: 'Thank you for powering the vibe! Your song request has been verified and securely routed to the DJ booth. Your payment is held safely in QueMyDJ Umpire Escrow until the DJ accepts and drops your track live.',
    ctaText: 'Track Live Booth Status',
    secondaryNote: 'Protected by QueMyDJ 100% Umpire Guarantee: If the DJ is unable to accommodate or play your track during the set, your payment is immediately refunded back to your wallet—no hassle, no delays.',
  },
  payout: {
    id: 'payout',
    name: 'DJ Settlement & Payout',
    description: 'Sent to resident DJs when live session earnings and multi-party splits are disbursed.',
    subjectPattern: 'Payout Disbursed: {{currency}} {{amount}} for {{sessionTitle}}',
    headline: 'Your Live Session Earnings Have Been Settled',
    introText: 'Great set tonight! Your performance earnings have been calculated and disbursed directly to your designated bank account via our automated Paystack split rail. Every accepted request has been verified on the ledger.',
    ctaText: 'Review Full Set Breakdown',
    secondaryNote: 'Settlement Transparency: All payout calculations reflect agreed venue commissions and immutable ledger records. For inquiries or breakdown statements, contact settlements@quemydj.com.',
  },
  dispute: {
    id: 'dispute',
    name: 'Umpire Dispute Resolution',
    description: 'Sent to guests or DJs following an umpire arbitration verdict or automated refund execution.',
    subjectPattern: 'QueMyDJ Umpire Notice: Decision Finalized for "{{songTitle}}"',
    headline: 'Dispute Arbitration Concluded',
    introText: 'QueMyDJ Umpire Chamber has completed the review of your live stage transaction. In accordance with our fair performance guidelines, the arbitration decision has been finalized.',
    ctaText: 'View Wallet & Settlement Details',
    secondaryNote: 'QueMyDJ Fair Play Policy: Our dispute resolution protocol ensures total integrity between partygoers, resident DJs, and venues. All arbitration rulings are logged immutably.',
  },
};

// In-memory persistent custom template cache
const customEmailTemplates: Map<string, EditableEmailTemplate> = new Map();

export function getEditableEmailTemplate(type: string): EditableEmailTemplate {
  return customEmailTemplates.get(type) || DEFAULT_EMAIL_TEMPLATES[type] || DEFAULT_EMAIL_TEMPLATES.invite;
}

export function getAllEditableEmailTemplates(): EditableEmailTemplate[] {
  return Object.keys(DEFAULT_EMAIL_TEMPLATES).map((key) => getEditableEmailTemplate(key));
}

export function updateEditableEmailTemplate(
  type: string,
  updates: Partial<EditableEmailTemplate>
): EditableEmailTemplate {
  const current = getEditableEmailTemplate(type);
  const updated: EditableEmailTemplate = {
    ...current,
    ...updates,
    id: current.id,
  };
  customEmailTemplates.set(type, updated);
  return updated;
}

export function resetEditableEmailTemplate(type: string): EditableEmailTemplate {
  customEmailTemplates.delete(type);
  return DEFAULT_EMAIL_TEMPLATES[type];
}

const BRAND_ACCENT = '#059669'; // Emerald-600
const BRAND_DARK = '#09090b'; // Zinc-950
const CANVAS_BG = '#f4f4f5'; // Zinc-100
const CARD_BG = '#ffffff';

export function renderQueMyDJEmailBase(opts: EmailLayoutOptions): string {
  const ctaBlock =
    opts.ctaText && opts.ctaUrl
      ? `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 24px 0;">
      <tr>
        <td align="left">
          <a href="${opts.ctaUrl}" target="_blank" style="display: inline-block; background-color: ${BRAND_DARK}; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 26px; border-radius: 8px; border: 1px solid #27272a;">
            ${opts.ctaText} &rarr;
          </a>
        </td>
      </tr>
    </table>`
      : '';

  const secondaryBlock = opts.secondaryNote
    ? `<p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.5; color: #71717a; border-top: 1px solid #f4f4f5; padding-top: 16px;">
        ${opts.secondaryNote}
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.headline}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${CANVAS_BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${CANVAS_BG};">
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${opts.preheader || opts.headline}
  </div>

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: ${CANVAS_BG}; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: ${CARD_BG}; border: 1px solid #e4e4e7; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Top Header Strip with Brand Logo -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #f4f4f5; background: #ffffff;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width: 38px; height: 38px; background-color: #000000; border-radius: 10px; text-align: center; vertical-align: middle; padding: 3px;">
                                <img src="${HOSTED_BRAND_LOGO_URL}" alt="QueMyDJ" width="32" height="32" style="display: block; margin: 0 auto; width: 32px; height: 32px; border: 0; outline: none; text-decoration: none;" />
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="padding-left: 12px; vertical-align: middle;">
                          <div style="font-size: 18px; font-weight: 800; color: #09090b; letter-spacing: -0.5px; line-height: 1.1;">
                            QueMyDJ
                          </div>
                          <div style="font-size: 10px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
                            Powered by <span style="color: #059669; font-weight: 700;">Zenbeatz</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle; font-size: 11px; font-family: monospace; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                    Official Notification
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              <h1 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: #09090b; letter-spacing: -0.4px;">
                ${opts.headline}
              </h1>

              ${
                opts.recipientName
                  ? `<p style="margin: 0 0 14px 0; font-size: 14px; color: #52525b;">Hello <strong>${opts.recipientName}</strong>,</p>`
                  : ''
              }

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #52525b;">
                ${opts.introText}
              </p>

              <!-- Dynamic Body Section -->
              ${opts.bodyHtml}

              <!-- Call To Action Button -->
              ${ctaBlock}

              <!-- Secondary Details / Footer Note -->
              ${secondaryBlock}
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #f4f4f5; padding: 20px 32px; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    &copy; ${new Date().getFullYear()} QueMyDJ &bull; Powered by <strong>Zenbeatz</strong>. All rights reserved.<br>
                    Real-time crowd requests, seamless live music rotation, and direct DJ tips.
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <span style="display: inline-block; width: 6px; height: 6px; background-color: ${BRAND_ACCENT}; border-radius: 50%;"></span>
                    <span style="font-size: 10px; color: #71717a; margin-left: 4px;">Secured by Paystack</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ------------------------------------------------------------------------------------------------
// 1. Admin Invitation Email
// ------------------------------------------------------------------------------------------------
export function generateAdminInviteEmail(params: {
  inviteeEmail: string;
  roleName: string;
  invitedByName: string;
  inviteLink: string;
  permissionsList: string[];
}): { subject: string; html: string } {
  const tpl = getEditableEmailTemplate('invite');
  const permListHtml = params.permissionsList
    .map(
      (p) => `<li style="margin-bottom: 4px; color: #3f3f46; font-size: 13px;">&#10003; <strong>${p}</strong></li>`
    )
    .join('');

  const bodyHtml = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #64748b;">
        Assigned Role: <span style="color: #0f172a;">${params.roleName}</span>
      </p>
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569;">
        You have been granted access to the following administrative modules:
      </p>
      <ul style="margin: 0; padding-left: 20px;">
        ${permListHtml}
      </ul>
    </div>
  `;

  const intro = tpl.introText.replace('{{invitedBy}}', params.invitedByName);
  const subject = tpl.subjectPattern.replace('{{role}}', params.roleName);

  const html = renderQueMyDJEmailBase({
    headline: tpl.headline,
    introText: intro,
    bodyHtml,
    ctaText: tpl.ctaText,
    ctaUrl: params.inviteLink,
    secondaryNote: tpl.secondaryNote,
  });

  return {
    subject,
    html,
  };
}


// ------------------------------------------------------------------------------------------------
// 2. Song Request Confirmed & Paid Receipt (Guest)
// ------------------------------------------------------------------------------------------------
export function generateGuestReceiptEmail(params: {
  guestName: string;
  songTitle: string;
  artist: string;
  djName: string;
  venueName: string;
  amountMajor: number;
  currency: string;
  reference: string;
  statusUrl: string;
  dashboardActivationUrl?: string;
}): { subject: string; html: string } {
  const tpl = getEditableEmailTemplate('receipt');
  
  const activationCardHtml = params.dashboardActivationUrl
    ? `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 18px 20px; margin: 24px 0 10px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px;">
        Claim Your Guest Account &amp; Track Status
      </p>
      <p style="margin: 0 0 12px 0; font-size: 13px; color: #14532d; line-height: 1.5;">
        Track this request live in the DJ booth, view your song history, and manage your Club Night Wallet by setting your password.
      </p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <a href="${params.dashboardActivationUrl}" target="_blank" style="display: inline-block; background-color: #166534; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; text-decoration: none; padding: 10px 20px; border-radius: 7px;">
              Create Password &amp; Open Dashboard &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>
    `
    : '';

  const bodyHtml = `
    <div style="background-color: #fcfcfc; border: 1px solid #e4e4e7; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13px; line-height: 2;">
        <tr>
          <td style="color: #71717a;">Song Title:</td>
          <td align="right" style="font-weight: 700; color: #09090b;">${params.songTitle}</td>
        </tr>
        <tr>
          <td style="color: #71717a;">Artist:</td>
          <td align="right" style="font-weight: 600; color: #27272a;">${params.artist}</td>
        </tr>
        <tr>
          <td style="color: #71717a;">Resident DJ:</td>
          <td align="right" style="font-weight: 600; color: #27272a;">${params.djName}</td>
        </tr>
        <tr>
          <td style="color: #71717a;">Venue / Stage:</td>
          <td align="right" style="font-weight: 600; color: #27272a;">${params.venueName}</td>
        </tr>
        <tr style="border-top: 1px solid #f4f4f5;">
          <td style="color: #09090b; font-weight: 700; padding-top: 8px;">Total Paid:</td>
          <td align="right" style="font-weight: 800; font-size: 16px; color: #059669; padding-top: 8px; font-family: monospace;">
            ${params.currency} ${params.amountMajor.toLocaleString()}
          </td>
        </tr>
        <tr>
          <td style="color: #a1a1aa; font-size: 11px;">Payment Reference:</td>
          <td align="right" style="font-size: 11px; font-family: monospace; color: #71717a;">${params.reference}</td>
        </tr>
      </table>
    </div>
    ${activationCardHtml}
  `;

  const subject = tpl.subjectPattern
    .replace('{{songTitle}}', params.songTitle)
    .replace('{{reference}}', params.reference);

  const html = renderQueMyDJEmailBase({
    recipientName: params.guestName,
    headline: tpl.headline,
    introText: tpl.introText,
    bodyHtml,
    ctaText: tpl.ctaText,
    ctaUrl: params.statusUrl,
    secondaryNote: tpl.secondaryNote,
  });

  return {
    subject,
    html,
  };
}


// ------------------------------------------------------------------------------------------------
// 3. DJ Live Payout Settlement Notification
// ------------------------------------------------------------------------------------------------
export function generateDjPayoutEmail(params: {
  djName: string;
  totalAmountMajor: number;
  currency: string;
  sessionTitle: string;
  venueName: string;
  splitPercentage: number;
  destinationAccount: string;
  statementUrl: string;
}): { subject: string; html: string } {
  const tpl = getEditableEmailTemplate('payout');
  const bodyHtml = `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #15803d;">
        Settlement Complete
      </p>
      <div style="font-size: 26px; font-weight: 800; color: #166534; font-family: monospace; margin-bottom: 12px;">
        ${params.currency} ${params.totalAmountMajor.toLocaleString()}
      </div>
      <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
        Net earnings (${params.splitPercentage}% split) for <strong>${params.sessionTitle}</strong> at ${params.venueName} have been settled to your registered account (<code>${params.destinationAccount}</code>).
      </p>
    </div>
  `;

  const subject = tpl.subjectPattern
    .replace('{{currency}}', params.currency)
    .replace('{{amount}}', params.totalAmountMajor.toLocaleString())
    .replace('{{sessionTitle}}', params.sessionTitle);

  const html = renderQueMyDJEmailBase({
    recipientName: params.djName,
    headline: tpl.headline,
    introText: tpl.introText,
    bodyHtml,
    ctaText: tpl.ctaText,
    ctaUrl: params.statementUrl,
    secondaryNote: tpl.secondaryNote,
  });

  return {
    subject,
    html,
  };
}


// ------------------------------------------------------------------------------------------------
// 4. Dispute Resolution Notification (Guest / DJ)
// ------------------------------------------------------------------------------------------------
export function generateDisputeResolutionEmail(params: {
  recipientName: string;
  resolutionType: 'refund_guest' | 'released_to_dj';
  amountMajor: number;
  currency: string;
  songTitle: string;
  reason: string;
  arbitratorNote: string;
}): { subject: string; html: string } {
  const tpl = getEditableEmailTemplate('dispute');
  const isRefund = params.resolutionType === 'refund_guest';
  const defaultHeadline = isRefund ? 'Dispute Resolved: Refund Approved' : 'Dispute Resolved: Payout Released';
  const headline = tpl.headline && tpl.headline !== DEFAULT_EMAIL_TEMPLATES.dispute.headline
    ? tpl.headline
    : defaultHeadline;
  const statusBg = isRefund ? '#eff6ff' : '#f0fdf4';
  const statusBorder = isRefund ? '#bfdbfe' : '#bbf7d0';
  const statusColor = isRefund ? '#1e40af' : '#166534';

  const bodyHtml = `
    <div style="background-color: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${statusColor};">
        ${isRefund ? 'Guest Wallet Credited' : 'Funds Granted to DJ'}
      </p>
      <div style="font-size: 22px; font-weight: 800; color: ${statusColor}; font-family: monospace; margin-bottom: 12px;">
        ${params.currency} ${params.amountMajor.toLocaleString()}
      </div>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;">
        <strong>Song:</strong> ${params.songTitle}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;">
        <strong>Dispute Ground:</strong> ${params.reason}
      </p>
      <p style="margin: 0; font-size: 12px; color: #6b7280; font-style: italic;">
        <strong>Arbitrator finding:</strong> ${params.arbitratorNote}
      </p>
    </div>
  `;

  const subject = tpl.subjectPattern.replace('{{songTitle}}', params.songTitle);

  const html = renderQueMyDJEmailBase({
    recipientName: params.recipientName,
    headline,
    introText: isRefund
      ? `QueMyDJ Umpire has concluded the dispute review and credited ${params.currency} ${params.amountMajor.toLocaleString()} back to your wallet.`
      : `QueMyDJ Umpire has concluded the dispute review and verified fulfillment. Funds have been released to the DJ earnings balance.`,
    bodyHtml,
    ctaText: tpl.ctaText,
    ctaUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    secondaryNote: tpl.secondaryNote,
  });

  return {
    subject,
    html,
  };
}

// ------------------------------------------------------------------------------------------------
// 5. User & DJ Password Reset Email
// ------------------------------------------------------------------------------------------------
export function generatePasswordResetEmail(params: {
  recipientName?: string;
  recipientEmail: string;
  resetLink: string;
}): { subject: string; html: string } {
  const tpl = getEditableEmailTemplate('password_reset');

  const bodyHtml = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">
        Account Security
      </p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e293b;">
        <strong>Target Account:</strong> ${params.recipientEmail}
      </p>
      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        You will be prompted to safely choose and confirm your new password upon opening this secure link.
      </p>
    </div>
  `;

  const html = renderQueMyDJEmailBase({
    recipientName: params.recipientName,
    headline: tpl.headline,
    introText: tpl.introText,
    bodyHtml,
    ctaText: tpl.ctaText,
    ctaUrl: params.resetLink,
    secondaryNote: tpl.secondaryNote,
  });

  return {
    subject: tpl.subjectPattern,
    html,
  };
}

// ------------------------------------------------------------------------------------------------
// 6. DJ Welcome & Onboarding Email
// ------------------------------------------------------------------------------------------------
export function generateDjWelcomeEmail(params: {
  djName: string;
  handle: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const tpl = getEditableEmailTemplate('welcome_dj');

  const bodyHtml = `
    <div style="background-color: #0c121e; border: 1px solid #1e293b; border-radius: 12px; padding: 22px; margin: 20px 0; color: #f8fafc;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #f59e0b; letter-spacing: 0.5px;">
        DJ Booth Station Active
      </p>
      <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
        ${params.djName} <span style="font-size: 13px; font-weight: 500; color: #94a3b8;">(${params.handle})</span>
      </div>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        Your digital live workstation is primed. Here is what you can do right now:
      </p>
      <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 13px; color: #e2e8f0; line-height: 1.8;">
        <li><strong>Accept or Decline Requests:</strong> You maintain 100% editorial control over your set tempo.</li>
        <li><strong>Earn Guaranteed Tips:</strong> Crowd tips and song payments are locked in escrow until accepted.</li>
        <li><strong>Automatic Paystack Payouts:</strong> Set your bank account to receive automated multi-party splits.</li>
      </ul>
    </div>
  `;

  const subject = tpl.subjectPattern.replace('{{djName}}', params.djName);

  const html = renderQueMyDJEmailBase({
    recipientName: params.djName,
    headline: tpl.headline,
    introText: tpl.introText,
    bodyHtml,
    ctaText: tpl.ctaText,
    ctaUrl: params.loginUrl,
    secondaryNote: tpl.secondaryNote,
  });

  return {
    subject,
    html,
  };
}

// ------------------------------------------------------------------------------------------------
// 7. Club Guest Welcome Email
// ------------------------------------------------------------------------------------------------
export function generateGuestWelcomeEmail(params: {
  guestName: string;
  exploreUrl: string;
}): { subject: string; html: string } {
  const tpl = getEditableEmailTemplate('welcome_guest');

  const bodyHtml = `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 22px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px;">
        VIP Club Night Pass Activated
      </p>
      <div style="font-size: 18px; font-weight: 800; color: #14532d; margin-bottom: 8px;">
        Welcome to the Party, ${params.guestName}!
      </div>
      <p style="margin: 0 0 14px 0; font-size: 13px; color: #166534; line-height: 1.5;">
        You are now connected to the QueMyDJ live nightlife ecosystem. Here is what you get:
      </p>
      <ul style="margin: 0 0 14px 0; padding-left: 20px; font-size: 13px; color: #14532d; line-height: 1.8;">
        <li><strong>Direct DJ Requests:</strong> Send your favorite songs directly to the DJ booth screen.</li>
        <li><strong>Custom Stage Shoutouts:</strong> Celebrate birthdays and VIP tables with messages on stage.</li>
        <li><strong>100% Umpire Guarantee:</strong> If the DJ cannot accommodate your jam, your funds return automatically.</li>
        <li><strong>Club Night Wallet:</strong> Enjoy 1-tap requests all night without repeated bank card authorizations.</li>
      </ul>
    </div>
  `;

  const html = renderQueMyDJEmailBase({
    recipientName: params.guestName,
    headline: tpl.headline,
    introText: tpl.introText,
    bodyHtml,
    ctaText: tpl.ctaText,
    ctaUrl: params.exploreUrl,
    secondaryNote: tpl.secondaryNote,
  });

  return {
    subject: tpl.subjectPattern,
    html,
  };
}
