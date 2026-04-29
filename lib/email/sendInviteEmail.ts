import { Resend } from 'resend';
import { render } from '@react-email/render';

import { InviteEmail } from '@/emails/InviteEmail';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(key);
}

export type SendInviteEmailArgs = {
  to: string;
  inviterName: string;
  inviteLink: string;
  scope: 'company' | 'workspace';
  targetName: string;
  companyName?: string;
  role: string;
  expiresInDays: number;
  productName?: string;
};

export async function sendInviteEmail({
  to,
  inviterName,
  inviteLink,
  scope,
  targetName,
  companyName,
  role,
  expiresInDays,
  productName = 'HyreLog'
}: SendInviteEmailArgs): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set. Cannot send invite email.');
    return { ok: false, error: 'Email service not configured' };
  }

  const html = await render(
    InviteEmail({
      inviterName,
      inviteLink,
      scope,
      targetName,
      companyName,
      role,
      expiresInDays,
      productName
    })
  );

  const from = process.env.MAIL_FROM ?? 'HyreLog <no-reply@hyrelog.com>';

  const result = await getResend().emails.send({
    from,
    to,
    subject: `${inviterName} invited you to join ${targetName} on ${productName}`,
    html
  });

  if (result.error) {
    console.error('❌ Resend API error (invite email):', result.error);
    return { ok: false, error: String(result.error.message ?? result.error) };
  }

  console.log(`📧 Invite email sent to ${to}`);
  return { ok: true };
}
