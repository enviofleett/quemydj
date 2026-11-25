import { Resend } from 'resend';

// Default sender address for production transactional emails
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'QueMyDJ <experience@quemydj.com>';

let resendInstance: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mode: 'resend' | 'simulated';
}

/**
 * Universal transactional email sender for QueMyDJ.
 * If RESEND_API_KEY is configured in .env.local, sends live emails via Resend.
 * Otherwise, logs payload securely and operates in verified sandbox mode.
 */
export async function sendQueMyDJEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResendClient();
  const from = opts.from || DEFAULT_FROM;
  const toList = Array.isArray(opts.to) ? opts.to : [opts.to];

  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: toList,
        subject: opts.subject,
        html: opts.html,
        replyTo: opts.replyTo || 'support@quemydj.com',
      });

      if (error) {
        console.error('[Resend Error]', error);
        return {
          success: false,
          error: error.message,
          mode: 'resend',
        };
      }

      console.log(`[Resend] Successfully delivered email to ${toList.join(', ')} (ID: ${data?.id})`);
      return {
        success: true,
        messageId: data?.id,
        mode: 'resend',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown Resend error';
      console.error('[Resend Exception]', message);
      return {
        success: false,
        error: message,
        mode: 'resend',
      };
    }
  }

  // Fallback when RESEND_API_KEY is not yet added to environment
  console.log(`[Email Dispatch: Sandbox Mode] To: ${toList.join(', ')} | Subject: "${opts.subject}"`);
  return {
    success: true,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mode: 'simulated',
  };
}
