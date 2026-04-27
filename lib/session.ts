import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Returns session with user.emailVerified and user.emailVerifiedAt merged from the DB.
 * Use this whenever you need to respect recent verification (e.g. right after magic link).
 */
export async function getFreshSession() {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList, query: { disableCookieCache: true } });
  if (!session?.user?.id) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, emailVerifiedAt: true }
  });
  if (!user) return session;

  return {
    ...session,
    user: {
      ...session.user,
      emailVerified: user.emailVerified,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null
    }
  } as typeof session;
}

export async function getSessionFromHeaders() {
  const h = await headers();
  return auth.api.getSession({ headers: h });
}
