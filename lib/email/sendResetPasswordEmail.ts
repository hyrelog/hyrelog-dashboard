import { Resend } from 'resend';
import { render } from '@react-email/render';
import { ResetPasswordEmail } from '@/emails/ResetPasswordEmail';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

export async function sendResetPasswordEmail({
  email,
  firstName,
  resetUrl
}: {
  email: string;
  firstName?: string;
  resetUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false as const, error: 'Email service not configured' };
  }

  const html = await render(
    ResetPasswordEmail({
      firstName,
      resetUrl,
      productName: 'HyreLog'
    })
  );

  const from = process.env.MAIL_FROM ?? 'HyreLog <no-reply@hyrelog.com>';
  const result = await getResend().emails.send({
    from,
    to: email,
    subject: 'Reset your HyreLog password',
    html
  });

  if (result.error) {
    return { ok: false as const, error: String(result.error.message ?? result.error) };
  }

  return { ok: true as const };
}
