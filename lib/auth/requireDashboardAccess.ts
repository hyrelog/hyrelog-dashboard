'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getFreshSession } from '@/lib/session';
import { safeReturnTo, toLogin, toCheckEmail, toOnboarding } from '@/lib/auth/redirects';
import {
  findWorkspaceIdNeedingSetup,
  findWorkspaceIdPendingProductOnboarding,
} from '@/lib/onboarding/eligibility';
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
    const companyId = sessionWithCompany.company.id;
    const needingSetupId = await findWorkspaceIdNeedingSetup(companyId);
    if (needingSetupId) {
      redirect(toOnboarding(needingSetupId, rt));
    }

    const pendingActivationId = await findWorkspaceIdPendingProductOnboarding(companyId);
    if (pendingActivationId) {
      const ws = await prisma.workspace.findUnique({
        where: { id: pendingActivationId },
        select: { onboardingSetupCompletedAt: true }
      });
      if (ws?.onboardingSetupCompletedAt != null) {
        const pathOnly = rt.split('?')[0]?.split('#')[0] ?? '/';
        const allowedDuringActivation =
          pathOnly === '/events' || pathOnly.startsWith('/events/');
        if (!allowedDuringActivation) {
          redirect(toOnboarding(pendingActivationId, rt));
        }
      }
    }
  }

  // At this point we've verified company (and thus userCompany) exist; cast so callers get a narrowed type
  if (!sessionWithCompany.userCompany) redirect('/invites');
  return session as typeof session & { company: NonNullable<typeof session.company>; userCompany: NonNullable<typeof session.userCompany> };
}
