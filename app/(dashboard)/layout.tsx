import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardSessionProvider } from '@/lib/dashboard/session-context';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { prisma } from '@/lib/prisma';
import { getCompanyAccess } from '@/lib/workspaces/access';
import { listWorkspacesForCompany, listWorkspacesForUser } from '@/lib/workspaces/queries';
import type { User, Company, Workspace } from '@/types/dashboard';
import { SubscriptionStatus } from '@/generated/prisma/client';
import { getDashboardEvents } from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';

function trialDaysRemainingFrom(trialEndsAt: Date | null | undefined): number | undefined {
  if (trialEndsAt == null) return undefined;
  const now = Date.now();
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / (24 * 60 * 60 * 1000)));
}

async function getWorkspaceMonthlyEventUsage(
  workspaceIds: string[],
  actor: { userId: string; userEmail: string; userRole: string; companyId: string }
): Promise<Map<string, { events: number; capped: boolean }>> {
  const usage = new Map<string, { events: number; capped: boolean }>();
  if (workspaceIds.length === 0 || !isHyreLogApiConfigured()) return usage;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const from = startOfMonth.toISOString();

  const MAX_WORKSPACES = 10;

  await Promise.all(
    workspaceIds.slice(0, MAX_WORKSPACES).map(async (workspaceId) => {
      try {
        const data = await getDashboardEvents(
          { workspaceId, from, limit: 1, offset: 0, sort: 'timestamp', order: 'desc' },
          actor
        );
        usage.set(workspaceId, { events: data.total, capped: false });
      } catch {
        usage.set(workspaceId, { events: 0, capped: false });
      }
    })
  );

  return usage;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';

  const session = await requireDashboardAccess(pathname);
  if (!session.company) redirect('/invites');

  const [access, companyWithSub, platformRoleRow] = await Promise.all([
    getCompanyAccess(session.user.id, session.company.id),
    prisma.company.findUnique({
      where: { id: session.company.id },
      select: {
        preferredRegion: true,
        apiCompanyId: true,
        subscription: {
          select: {
            status: true,
            trialEndsAt: true
          }
        }
      }
    }),
    prisma.platformRole.findUnique({
      where: { userId: session.user.id },
      select: { role: true }
    })
  ]);

  if (!access) redirect('/invites');

  const seeAllWorkspaces = access.canAdmin || access.canBilling;
  const workspacesRows = seeAllWorkspaces
    ? await listWorkspacesForCompany(session.company.id)
    : await listWorkspacesForUser(session.user.id);

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: session.userCompany.role,
    companyId: session.company.id
  };
  const monthlyUsage = await getWorkspaceMonthlyEventUsage(
    workspacesRows.map((w) => w.id),
    actor
  );

  const user: User = {
    id: session.user.id,
    email: session.user.email ?? '',
    firstName: (session.user as { firstName?: string }).firstName ?? '',
    lastName: (session.user as { lastName?: string }).lastName ?? '',
    companyRole: session.userCompany.role,
    platformRole:
      (session.user as { platformRole?: User['platformRole'] }).platformRole ??
      platformRoleRow?.role ??
      null
  };

  const sub = companyWithSub?.subscription;
  const planType: Company['planType'] =
    sub?.status === SubscriptionStatus.TRIALING
      ? 'TRIAL'
      : sub?.status === SubscriptionStatus.ACTIVE
        ? 'ACTIVE'
        : 'INACTIVE';

  const company: Company = {
    id: session.company.id,
    name: session.company.name,
    slug: session.company.slug,
    preferredRegion: (
      session.company.preferredRegion ??
      companyWithSub?.preferredRegion ??
      'US'
    ).toString(),
    apiCompanyId: companyWithSub?.apiCompanyId ?? null,
    planType,
    trialDaysRemaining: trialDaysRemainingFrom(sub?.trialEndsAt)
  };

  const workspaces: Workspace[] = workspacesRows.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    region: (w.preferredRegion ?? 'US').toString(),
    memberCount: w._count.members,
    monthlyEvents: monthlyUsage.get(w.id)?.events ?? null,
    monthlyEventsCapped: monthlyUsage.get(w.id)?.capped ?? false,
    status: ((w as { status?: string }).status ?? 'ACTIVE') as Workspace['status'],
    companyId: session.company.id
  }));

  const isCompanyAdmin = seeAllWorkspaces;

  const sessionPayload = {
    session,
    user,
    company,
    workspaces,
    isCompanyAdmin
  };

  return (
    <DashboardSessionProvider value={sessionPayload}>
      <DashboardShell
        user={user}
        company={company}
        workspaces={workspaces}
        isCompanyAdmin={isCompanyAdmin}
        pathname={pathname}
      >
        {children}
      </DashboardShell>
    </DashboardSessionProvider>
  );
}
