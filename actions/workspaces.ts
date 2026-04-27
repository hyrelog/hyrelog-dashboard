'use server';

import GithubSlugger from 'github-slugger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { provisionWorkspaceAndStore } from '@/actions/provisioning';
import { toApiDataRegion } from '@/lib/hyrelog-api';

import type { CompanyRole } from '@/generated/prisma/client';

const ADMIN_ROLES: CompanyRole[] = ['OWNER', 'ADMIN', 'BILLING'];

export async function isCompanyAdmin(role: CompanyRole) {
  return ADMIN_ROLES.includes(role);
}

export async function listWorkspacesForCompany(companyId: string) {
  return prisma.workspace.findMany({
    where: { companyId, deletedAt: null, status: { not: 'ARCHIVED' } },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      preferredRegion: true,
      createdAt: true,
      _count: { select: { members: true } },
      company: { select: { id: true, slug: true } }
    }
  });
}

export async function listWorkspacesForUser(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId,
      workspace: { deletedAt: null, status: { not: 'ARCHIVED' } }
    },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          preferredRegion: true,
          createdAt: true,
          _count: { select: { members: true } },
          company: { select: { id: true, slug: true } }
        }
      }
    }
  });

  // Flatten, stable sort
  const workspaces = memberships
    .map((m) => ({ ...m.workspace, myWorkspaceRole: m.role }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  return workspaces;
}

const CreateWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  preferredRegion: z.enum(['US', 'EU', 'UK', 'AU']).optional()
});

const RenameWorkspaceSchema = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(2).max(80)
});

async function uniqueWorkspaceSlug(companyId: string, base: string) {
  const root = base.trim() || 'workspace';
  const slugger = new GithubSlugger();

  // Try root, root-2, root-3, ... via slugger
  for (let i = 0; i < 50; i++) {
    const label = i === 0 ? root : `${root} ${i + 1}`;
    const candidate = slugger.slug(label);
    const exists = await prisma.workspace.findFirst({
      where: { companyId, slug: candidate },
      select: { id: true }
    });
    if (!exists) return candidate;
  }

  // fallback (extremely unlikely)
  return `${slugger.slug(root)}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createWorkspaceAction(input: z.infer<typeof CreateWorkspaceSchema>) {
  const session = await requireDashboardAccess('/workspaces');
  const sessionWithCompany = session as { company: { id: string }; userCompany: { role: CompanyRole } };
  const company = sessionWithCompany.company;

  if (!isCompanyAdmin(sessionWithCompany.userCompany.role)) {
    return { ok: false as const, error: 'Not allowed.' };
  }

  const parsed = CreateWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid fields.';
    return { ok: false as const, error: message };
  }

  const { name, preferredRegion } = parsed.data;
  const slug = await uniqueWorkspaceSlug(company.id, name);
  const now = new Date();

  const companyRow = await prisma.company.findUnique({
    where: { id: company.id },
    select: { apiCompanyId: true, preferredRegion: true },
  });
  if (!companyRow) {
    return { ok: false as const, error: 'Company not found.' };
  }

  if (companyRow.apiCompanyId && preferredRegion) {
    const orgRegion = toApiDataRegion(companyRow.preferredRegion);
    const want = toApiDataRegion(preferredRegion);
    if (orgRegion !== want) {
      return {
        ok: false as const,
        error: `This company is already provisioned in ${orgRegion}. You cannot add a workspace in ${want} to the same organization—create a new account/company for another region, or use ${orgRegion} here.`,
      };
    }
  }

  const workspace = await prisma.$transaction(async (tx) => {
    if (!companyRow.apiCompanyId && preferredRegion) {
      await tx.company.update({
        where: { id: company.id },
        data: { preferredRegion },
      });
    }

    const ws = await tx.workspace.create({
      data: {
        companyId: company.id,
        name,
        slug,
        preferredRegion: preferredRegion ?? null,
        status: 'ACTIVE',
        isAutoNamed: false,
        onboardingStatus: 'COMPLETE',
        onboardingCompletedAt: now,
        onboardingCompletedBy: session.user.id
      },
      select: { id: true }
    });

    await tx.workspaceMember.upsert({
      where: {
        userId_workspaceId: { userId: session.user.id, workspaceId: ws.id }
      },
      update: { role: 'ADMIN' },
      create: {
        userId: session.user.id,
        workspaceId: ws.id,
        role: 'ADMIN'
      }
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: company.id,
        action: 'WORKSPACE_CREATED',
        resourceType: 'Workspace',
        resourceId: ws.id,
        details: { name, slug, preferredRegion: preferredRegion ?? null }
      }
    });

    return ws;
  });

  const sessionWithUser = session as { user: { id: string; email: string | null }; userCompany: { role: string } };
  const prov = await provisionWorkspaceAndStore(workspace.id, {
    userId: sessionWithUser.user.id,
    userEmail: sessionWithUser.user.email ?? null,
    userRole: sessionWithUser.userCompany.role,
  });
  if (!prov.ok) {
    return { ok: false as const, error: prov.error };
  }

  return { ok: true as const, id: workspace.id };
}

export async function renameWorkspaceAction(input: z.infer<typeof RenameWorkspaceSchema>) {
  const session = await requireDashboardAccess('/workspaces');
  const sessionWithCompany = session as { company: { id: string }; userCompany: { role: CompanyRole } };
  const company = sessionWithCompany.company;

  if (!isCompanyAdmin(sessionWithCompany.userCompany.role)) {
    return { success: false as const, message: 'Not allowed.' };
  }

  const parsed = RenameWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, message: 'Invalid fields.' };
  }

  const { workspaceId, name } = parsed.data;

  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, companyId: company.id, deletedAt: null },
    select: { id: true, name: true }
  });

  if (!ws) return { success: false as const, message: 'Workspace not found.' };

  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: ws.id },
      data: { name }
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: company.id,
        action: 'WORKSPACE_UPDATED',
        resourceType: 'Workspace',
        resourceId: ws.id,
        details: { from: { name: ws.name }, to: { name } }
      }
    });
  });

  return { success: true as const };
}
