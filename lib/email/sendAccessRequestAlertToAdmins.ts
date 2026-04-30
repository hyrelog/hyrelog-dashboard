import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { PlatformRoleType } from '@/generated/prisma/client';
import { AccessRequestAdminEmail } from '@/emails/AccessRequestAdminEmail';

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

export async function sendAccessRequestAlertToAdmins({
  requesterName,
  requesterEmail
}: {
  requesterName: string;
  requesterEmail: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false as const, error: 'Email service not configured' };
  }

  const admins = await prisma.platformRole.findMany({
    where: { role: PlatformRoleType.HYRELOG_ADMIN },
    select: {
      user: {
        select: { email: true }
      }
    }
  });

  const recipients = Array.from(
    new Set(admins.map((a) => a.user.email).filter((email): email is string => Boolean(email)))
  );

  if (recipients.length === 0) {
    return { ok: true as const };
  }

  const baseUrl = getBaseUrl();
  const reviewUrl = new URL('/admin/users', baseUrl).toString();

  const html = await render(
    AccessRequestAdminEmail({
      requesterName,
      requesterEmail,
      reviewUrl
    })
  );

  const from = process.env.MAIL_FROM ?? 'HyreLog <no-reply@hyrelog.com>';
  const result = await getResend().emails.send({
    from,
    to: recipients,
    subject: `New access request: ${requesterEmail}`,
    html
  });

  if (result.error) {
    return { ok: false as const, error: String(result.error.message ?? result.error) };
  }

  return { ok: true as const };
}
