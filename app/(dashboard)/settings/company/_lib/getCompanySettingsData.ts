import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { listCompanyApiKeys } from '@/lib/hyrelog-api';

export async function getCompanySettingsData() {
  const session = await requireDashboardAccess('/company-settings');
  const companyId = (session as { company: { id: string } }).company.id;
  const userEmail = (session as { user: { email: string | null } }).user.email;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  const canEdit = ['OWNER', 'ADMIN'].includes(userRole);

  const company = await prisma.company.findFirst({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      preferredRegion: true,
      status: true,
      apiCompanyId: true,
      createdVia: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          members: true,
          workspaces: true,
        },
      },
    },
  });

  if (!company) redirect('/');

  const members = await prisma.companyMember.findMany({
    where: { companyId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          sessions: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { updatedAt: true },
          },
        },
      },
    },
  });

  const workspaces = await prisma.workspace.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ createdAt: 'desc' }],
    take: 25,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      preferredRegion: true,
      apiWorkspaceId: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    select: {
      status: true,
      interval: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      plan: { select: { code: true, name: true } },
      stripeCustomerId: true,
    },
  });

  const currentUsage = await prisma.usagePeriod.findFirst({
    where: { companyId },
    orderBy: { periodStart: 'desc' },
    select: {
      periodStart: true,
      periodEnd: true,
      eventsIngested: true,
      exportsCreated: true,
      webhooksActive: true,
    },
  });

  let companyApiKeys: Awaited<ReturnType<typeof listCompanyApiKeys>>['items'] = [];
  try {
    const actor = {
      companyId,
      userId: session.user.id,
      userEmail: session.user.email ?? undefined,
      userRole,
    };
    const res = await listCompanyApiKeys(actor);
    companyApiKeys = res.items;
  } catch {
    companyApiKeys = [];
  }

  return {
    company,
    members,
    workspaces,
    companyApiKeys,
    subscription,
    currentUsage,
    fallbackPrimaryEmail: userEmail,
    canEdit,
  };
}

