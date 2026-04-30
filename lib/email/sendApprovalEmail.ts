import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ApprovalEmail } from '@/emails/ApprovalEmail';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

function getBaseUrl() {
  const raw = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const normalized = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  return new URL(normalized);
}

export async function sendApprovalEmail({
  to,
  firstName
}: {
  to: string;
  firstName?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false as const, error: 'Email service not configured' };
  }

  const baseUrl = getBaseUrl();
  const loginUrl = new URL('/auth/login', baseUrl).toString();

  const html = await render(
    ApprovalEmail({
      firstName,
      productName: 'HyreLog',
      loginUrl
    })
  );

  const from = process.env.MAIL_FROM ?? 'HyreLog <no-reply@hyrelog.com>';
  const result = await getResend().emails.send({
    from,
    to,
    subject: 'Your HyreLog account is approved',
    html
  });

  if (result.error) {
    return { ok: false as const, error: String(result.error.message ?? result.error) };
  }

  return { ok: true as const };
}
