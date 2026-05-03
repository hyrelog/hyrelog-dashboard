'use server';

import { prisma } from '@/lib/prisma';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { PlatformRoleType, UserStatus } from '@/generated/prisma/client';
import { sendApprovalEmail } from '@/lib/email/sendApprovalEmail';

async function requirePlatformAdmin(returnTo = '/admin/users') {
  const session = await requireDashboardAccess(returnTo);
  const role = await prisma.platformRole.findUnique({
    where: { userId: session.user.id },
    select: { role: true }
  });

  if (role?.role !== PlatformRoleType.HYRELOG_ADMIN) return null;
  return session;
}

export type PlatformAdminStats = {
  generatedAt: string;
  users: {
    total: number;
    active: number;
    deactivated: number;
    emailVerified: number;
    platformAdmins: number;
    withCompanyMembership: number;
  };
  tenancy: {
    companies: number;
    companiesLinkedToApi: number;
    workspaces: number;
    workspacesLinkedToApi: number;
    projects: number;
    projectsLinkedToApi: number;
    companyMemberRows: number;
    workspaceMemberRows: number;
  };
  usage: {
    /** Sum of metered ingest across all billing periods (no event payloads). */
    eventsIngestedAllPeriods: number;
    exportsCreatedAllPeriods: number;
    usagePeriodRowCount: number;
  };
  byRegion: Array<{
    region: string;
    companies: number;
    eventsIngestedAllPeriods: number;
    workspaces: number;
  }>;
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    preferredRegion: string;
    linkedToApi: boolean;
    workspaceCount: number;
    memberCount: number;
    eventsIngestedAllPeriods: number;
    exportsCreatedAllPeriods: number;
  }>;
};

export async function getPlatformAdminStats(): Promise<
  { ok: true; stats: PlatformAdminStats } | { ok: false; error: string }
> {
  const session = await requirePlatformAdmin('/admin/stats');
  if (!session) return { ok: false, error: 'Forbidden' };

  const companyWhere = { deletedAt: null as Date | null };

  const [
    userStatusCounts,
    usersEmailVerified,
    usersWithCompany,
    platformAdmins,
    companiesTotal,
    companiesLinked,
    workspacesTotal,
    workspacesLinked,
    projectsTotal,
    projectsLinked,
    companyMemberRows,
    workspaceMemberRows,
    usageTotals,
    usageByCompany,
    workspaceCountByCompany,
    memberCountByCompany,
    companies
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ['status'],
      _count: { _all: true }
    }),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.user.count({
      where: { companyMemberships: { some: {} } }
    }),
    prisma.platformRole.count({
      where: { role: PlatformRoleType.HYRELOG_ADMIN }
    }),
    prisma.company.count({ where: companyWhere }),
    prisma.company.count({
      where: { ...companyWhere, apiCompanyId: { not: null } }
    }),
    prisma.workspace.count({
      where: { deletedAt: null }
    }),
    prisma.workspace.count({
      where: { deletedAt: null, apiWorkspaceId: { not: null } }
    }),
    prisma.project.count({
      where: { deletedAt: null }
    }),
    prisma.project.count({
      where: { deletedAt: null, apiProjectId: { not: null } }
    }),
    prisma.companyMember.count(),
    prisma.workspaceMember.count(),
    prisma.usagePeriod.aggregate({
      _sum: { eventsIngested: true, exportsCreated: true },
      _count: true
    }),
    prisma.usagePeriod.groupBy({
      by: ['companyId'],
      _sum: { eventsIngested: true, exportsCreated: true }
    }),
    prisma.workspace.groupBy({
      by: ['companyId'],
      where: { deletedAt: null },
      _count: true
    }),
    prisma.companyMember.groupBy({
      by: ['companyId'],
      _count: true
    }),
    prisma.company.findMany({
      where: companyWhere,
      select: {
        id: true,
        name: true,
        slug: true,
        preferredRegion: true,
        apiCompanyId: true
      },
      orderBy: { name: 'asc' }
    })
  ]);

  const activeUsers =
    userStatusCounts.find((r) => r.status === UserStatus.ACTIVE)?._count._all ?? 0;
  const deactivatedUsers =
    userStatusCounts.find((r) => r.status === UserStatus.DEACTIVATED)?._count._all ?? 0;

  const usageMap = new Map(
    usageByCompany.map((r) => [
      r.companyId,
      {
        events: r._sum.eventsIngested ?? 0,
        exports: r._sum.exportsCreated ?? 0
      }
    ])
  );
  const wsCountMap = new Map(
    workspaceCountByCompany.map((r) => [r.companyId, r._count])
  );
  const memberCountMap = new Map(
    memberCountByCompany.map((r) => [r.companyId, r._count])
  );

  const regionOrder = ['US', 'EU', 'UK', 'AU', 'APAC'] as const;
  const regionAgg = new Map<
    string,
    { companies: number; events: number; workspaces: number }
  >();

  for (const c of companies) {
    const region = String(c.preferredRegion);
    const cur = regionAgg.get(region) ?? {
      companies: 0,
      events: 0,
      workspaces: 0
    };
    cur.companies += 1;
    cur.events += usageMap.get(c.id)?.events ?? 0;
    cur.workspaces += wsCountMap.get(c.id) ?? 0;
    regionAgg.set(region, cur);
  }

  const byRegion = [...regionAgg.entries()]
    .map(([region, v]) => ({
      region,
      companies: v.companies,
      eventsIngestedAllPeriods: v.events,
      workspaces: v.workspaces
    }))
    .sort((a, b) => {
      const ia = regionOrder.indexOf(a.region as (typeof regionOrder)[number]);
      const ib = regionOrder.indexOf(b.region as (typeof regionOrder)[number]);
      const sa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
      const sb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
      if (sa !== sb) return sa - sb;
      return a.region.localeCompare(b.region);
    });

  const companyRows = companies
    .map((c) => {
      const u = usageMap.get(c.id);
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        preferredRegion: String(c.preferredRegion),
        linkedToApi: Boolean(c.apiCompanyId),
        workspaceCount: wsCountMap.get(c.id) ?? 0,
        memberCount: memberCountMap.get(c.id) ?? 0,
        eventsIngestedAllPeriods: u?.events ?? 0,
        exportsCreatedAllPeriods: u?.exports ?? 0
      };
    })
    .sort((a, b) => b.eventsIngestedAllPeriods - a.eventsIngestedAllPeriods);

  return {
    ok: true,
    stats: {
      generatedAt: new Date().toISOString(),
      users: {
        total: activeUsers + deactivatedUsers,
        active: activeUsers,
        deactivated: deactivatedUsers,
        emailVerified: usersEmailVerified,
        platformAdmins: platformAdmins,
        withCompanyMembership: usersWithCompany
      },
      tenancy: {
        companies: companiesTotal,
        companiesLinkedToApi: companiesLinked,
        workspaces: workspacesTotal,
        workspacesLinkedToApi: workspacesLinked,
        projects: projectsTotal,
        projectsLinkedToApi: projectsLinked,
        companyMemberRows,
        workspaceMemberRows
      },
      usage: {
        eventsIngestedAllPeriods: usageTotals._sum.eventsIngested ?? 0,
        exportsCreatedAllPeriods: usageTotals._sum.exportsCreated ?? 0,
        usagePeriodRowCount: usageTotals._count
      },
      byRegion,
      companies: companyRows
    }
  };
}

export async function listUsersForPlatformAdmin() {
  const session = await requirePlatformAdmin('/admin/users');
  if (!session) return { ok: false as const, error: 'Forbidden' };

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      platformRole: {
        select: { role: true }
      }
    }
  });

  return { ok: true as const, users };
}

export async function approveUser(userId: string) {
  const session = await requirePlatformAdmin('/admin/users');
  if (!session) return { ok: false as const, error: 'Forbidden' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, status: true }
  });
  if (!user) return { ok: false as const, error: 'User not found' };

  if (user.status === UserStatus.ACTIVE) {
    return { ok: true as const };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE }
  });

  try {
    await sendApprovalEmail({ to: user.email, firstName: user.firstName });
  } catch (error) {
    console.error('[approveUser] failed to send approval email', error);
  }

  return { ok: true as const };
}

export async function grantPlatformAdmin(userId: string) {
  const session = await requirePlatformAdmin('/admin/users');
  if (!session) return { ok: false as const, error: 'Forbidden' };

  await prisma.platformRole.upsert({
    where: { userId },
    update: { role: PlatformRoleType.HYRELOG_ADMIN },
    create: { userId, role: PlatformRoleType.HYRELOG_ADMIN }
  });

  return { ok: true as const };
}

export async function revokePlatformAdmin(userId: string) {
  const session = await requirePlatformAdmin('/admin/users');
  if (!session) return { ok: false as const, error: 'Forbidden' };
  if (session.user.id === userId) return { ok: false as const, error: 'Cannot revoke yourself' };

  await prisma.platformRole.deleteMany({
    where: { userId, role: PlatformRoleType.HYRELOG_ADMIN }
  });

  return { ok: true as const };
}
