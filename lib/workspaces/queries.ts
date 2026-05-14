import { prisma } from '@/lib/prisma';
import type { CompanyRole } from '@/generated/prisma/client';

const ADMIN_ROLES: CompanyRole[] = ['OWNER', 'ADMIN', 'BILLING'];

export function isCompanyAdmin(role: CompanyRole): boolean {
  return ADMIN_ROLES.includes(role);
}

const workspaceListSelect = {
  id: true,
  name: true,
  slug: true,
  apiWorkspaceId: true,
  preferredRegion: true,
  createdAt: true,
  _count: { select: { members: true } },
  company: { select: { preferredRegion: true, slug: true } }
} as const;

export async function listWorkspacesForCompany(companyId: string) {
  return prisma.workspace.findMany({
    where: {
      companyId,
      deletedAt: null,
      status: { not: 'ARCHIVED' }
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: {
      ...workspaceListSelect,
      status: true
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
          companyId: true,
          apiWorkspaceId: true,
          name: true,
          slug: true,
          status: true,
          preferredRegion: true,
          createdAt: true,
          _count: { select: { members: true } },
          company: { select: { preferredRegion: true, slug: true } }
        }
      }
    }
  });

  const workspaces = memberships
    .map((m) => ({ ...m.workspace, myWorkspaceRole: m.role }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  return workspaces;
}
