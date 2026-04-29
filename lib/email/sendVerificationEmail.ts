import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { render } from '@react-email/render';

import { VerificationEmail } from '@/emails/VerificationEmail';
import { randomToken, randomOtp6, sha256 } from '@/lib/crypto';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not set');
  }
  return new Resend(key);
}

function getBaseUrl() {
  const raw = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const normalized = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  try {
    return new URL(normalized);
  } catch (error) {
    throw new Error(`Invalid APP_URL: "${raw}"`);
  }
}

type SendVerificationEmailArgs = {
  userId: string;
  email: string;
  firstName?: string;
};

export async function sendVerificationEmail({
  userId,
  email,
  firstName
}: SendVerificationEmailArgs) {
  const magicToken = randomToken(32);
  const otp = randomOtp6();

  const magicTokenHash = sha256(magicToken);
  const otpHash = sha256(otp);

  const now = new Date();
  const magicExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 min
  const otpExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 min

  // Optional: invalidate older unused challenges for this user (recommended)
  await prisma.emailVerificationChallenge.updateMany({
    where: { userId, usedAt: null },
    data: { revokedAt: now }
  });

  // Create a new challenge
  const challenge = await prisma.emailVerificationChallenge.create({
    data: {
      userId,
      email,
      magicTokenHash,
      otpHash,
      magicExpiresAt,
      otpExpiresAt,
      otpAttempts: 0,
      sendCount: 1,
      lastSentAt: now
    },
    select: { id: true }
  });

  const baseUrl = getBaseUrl(); // e.g. https://app.hyrelog.com
  const verifyUrl = new URL('/auth/verify-email', baseUrl);
  verifyUrl.searchParams.set('token', magicToken);
  verifyUrl.searchParams.set('cid', challenge.id); // tie to challenge id
  // (Optional) include email to help UI, but do NOT rely on it for auth
  verifyUrl.searchParams.set('email', email);

  const html = await render(
    VerificationEmail({
      firstName,
      verifyUrl: verifyUrl.toString(),
      otp,
      expiresMinutesMagic: 15,
      expiresMinutesOtp: 10,
      productName: 'HyreLog'
    })
  );

  const from = process.env.MAIL_FROM ?? 'HyreLog <no-reply@hyrelog.com>';

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set. Cannot send email.');
    throw new Error('Email service not configured');
  }

  const result = await getResend().emails.send({
    from,
    to: email,
    subject: 'Verify your email for HyreLog',
    html
  });

  if (result.error) {
    console.error('❌ Resend API error:', result.error);
    throw new Error(`Failed to send email: ${JSON.stringify(result.error)}`);
  }

  console.log(`📧 Email sent successfully to ${email} (challenge ID: ${challenge.id})`);
}
