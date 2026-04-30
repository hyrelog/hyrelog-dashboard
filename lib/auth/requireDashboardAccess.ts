'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getFreshSession } from '@/lib/session';
import { safeReturnTo, toLogin, toCheckEmail, toOnboarding } from '@/lib/auth/redirects';
import { UserStatus } from '@/generated/prisma/client';

export async function requireDashboardAccess(returnTo?: string) {
  const rt = safeReturnTo(returnTo);

  const session = await getFreshSession();

  if (!session) {
    redirect(toLogin(rt));
  }

  if (!session.user.emailVerified) {
    redirect(toCheckEmail(session.user.email, rt));
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { status: true }
  });

  if (user?.status === UserStatus.DEACTIVATED) {
    redirect('/auth/pending-approval');
  }

  // User has no company (e.g. invited but not yet accepted) -> send to invites
  const sessionWithCompany = session as { company: { id: string; createdByUserId: string | null } | null; userCompany: { role: string } | null };
  if (!sessionWithCompany.company) {
    redirect('/invites');
  }

  const isCreator = sessionWithCompany.company.createdByUserId === session.user.id;
  if (isCreator) {
    const pending = await prisma.workspace.findFirst({
      where: {
        companyId: sessionWithCompany.company.id,
        deletedAt: null,
        onboardingStatus: 'PENDING'
      },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true }
    });

    if (pending) {
      redirect(toOnboarding(pending.id, rt));
    }
  }

  // At this point we've verified company (and thus userCompany) exist; cast so callers get a narrowed type
  if (!sessionWithCompany.userCompany) redirect('/invites');
  return session as typeof session & { company: NonNullable<typeof session.company>; userCompany: NonNullable<typeof session.userCompany> };
}
