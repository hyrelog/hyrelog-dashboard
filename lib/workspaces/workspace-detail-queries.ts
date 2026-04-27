import { prisma } from '@/lib/prisma';
import type { CompanyRole, WorkspaceRole } from '@/generated/prisma/client';

export type { CompanyRole };
import type { EffectiveWorkspaceRole } from './permissions';
import { getEffectiveWorkspaceAccess } from './access';

export interface WorkspaceDetailSession {
  user: { id: string };
  company: { id: string; preferredRegion: string; slug?: string };
  userCompany: { role: CompanyRole };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveWorkspaceIdOrSlug(
  workspaceIdOrSlug: string,
  companyId: string,
  companySlug: string | undefined
): { id?: string; slug?: string } {
  if (UUID_REGEX.test(workspaceIdOrSlug)) {
    return { id: workspaceIdOrSlug };
  }
  const workspaceSlug =
    companySlug && workspaceIdOrSlug.startsWith(companySlug + '-')
      ? workspaceIdOrSlug.slice(companySlug.length + 1)
      : workspaceIdOrSlug;
  return { slug: workspaceSlug };
}

export interface WorkspaceDetailMember {
  id: string;
  role: WorkspaceRole;
  companyRole: CompanyRole | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    image: string | null;
  };
}

export interface WorkspaceDetailProject {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  status: string;
}

export interface WorkspaceDetailKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface WorkspaceDetailPayload {
  workspace: {
    id: string;
    name: string;
    slug: string;
    preferredRegion: string | null;
    status: string;
    apiWorkspaceId: string | null;
    createdAt: Date;
    isAutoNamed: boolean | null;
      company: { id: string; preferredRegion: string; apiCompanyId: string | null };
    _count: { members: number };
  };
  /** Effective region for display: workspace.preferredRegion ?? company.preferredRegion */
  effectiveRegion: string;
  projects: WorkspaceDetailProject[];
  members: WorkspaceDetailMember[];
  keys: WorkspaceDetailKey[];
  /** Derived: company role is OWNER or ADMIN */
  isCompanyOwnerAdmin: boolean;
  /** Derived: company role is BILLING */
  isCompanyBilling: boolean;
  /** Derived: effective workspace role (ADMIN | WRITER | READER) */
  effectiveRole: EffectiveWorkspaceRole;
  /** Derived: can create/edit projects */
  canWrite: boolean;
  /** Derived: can manage settings, members, delete projects */
  canAdmin: boolean;
  /** Region is locked (apiWorkspaceId set) */
  regionLocked: boolean;
  /** Workspace is archived (writes blocked; restore available to admins) */
  isArchived: boolean;
}

/**
 * Check if a workspace exists for the company (by id or slug) and is not deleted.
 * Use to distinguish "not found" from "no access" on the detail page.
 */
export async function workspaceExistsForCompany(
  workspaceIdOrSlug: string,
  companyId: string,
  companySlug: string | undefined
): Promise<boolean> {
  const resolved = resolveWorkspaceIdOrSlug(workspaceIdOrSlug, companyId, companySlug);
  const w = await prisma.workspace.findFirst({
    where: {
      ...(resolved.id
        ? { id: resolved.id, companyId }
        : { slug: resolved.slug, companyId }),
      deletedAt: null
    },
    select: { id: true }
  });
  return w != null;
}

/**
 * Fetch workspace by id or by companySlug-workspaceSlug for the current user's company.
 * Access: user can view if (1) company OWNER/ADMIN/BILLING and workspace.companyId === company.id,
 * or (2) user has WorkspaceMember for this workspace and workspace.companyId === company.id.
 * Returns null if workspace not found or user not authorized.
 */
export async function getWorkspaceDetailForUser(
  workspaceIdOrSlug: string,
  session: WorkspaceDetailSession
): Promise<WorkspaceDetailPayload | null> {
  const resolved = resolveWorkspaceIdOrSlug(
    workspaceIdOrSlug,
    session.company.id,
    session.company.slug
  );

  const workspace = await prisma.workspace.findFirst({
    where: {
      ...(resolved.id
        ? { id: resolved.id, companyId: session.company.id }
        : { slug: resolved.slug, companyId: session.company.id }),
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      slug: true,
      preferredRegion: true,
      status: true,
      apiWorkspaceId: true,
      createdAt: true,
      isAutoNamed: true,
      company: { select: { id: true, preferredRegion: true, apiCompanyId: true } },
      _count: { select: { members: true } },
      apiKeys: {
        select: {
          id: true,
          name: true,
          prefix: true,
          lastUsedAt: true,
          revokedAt: true,
          createdAt: true
        }
      },
      members: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              image: true
            }
          }
        }
      },
      projects: {
        where: { deletedAt: null },
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          status: true
        }
      }
    }
  });

  if (!workspace) return null;

  const access = await getEffectiveWorkspaceAccess(session.user.id, workspace.id);
  if (!access || !access.canRead) return null;

  const companyId = (workspace.company as { id: string }).id;
  const memberUserIds = workspace.members.map((m) => m.user.id);
  const companyMembers =
    companyId && memberUserIds.length > 0
      ? await prisma.companyMember.findMany({
          where: { companyId, userId: { in: memberUserIds } },
          select: { userId: true, role: true }
        })
      : [];
  const companyRoleByUserId = new Map(companyMembers.map((cm) => [cm.userId, cm.role]));

  const effectiveRole: EffectiveWorkspaceRole = access.canAdmin
    ? 'ADMIN'
    : access.canWrite
      ? 'WRITER'
      : 'READER';

  const effectiveRegion =
    workspace.preferredRegion ?? workspace.company.preferredRegion ?? 'N/A';

  const isArchived = workspace.status === 'ARCHIVED';

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      preferredRegion: workspace.preferredRegion,
      status: workspace.status,
      apiWorkspaceId: workspace.apiWorkspaceId,
      createdAt: workspace.createdAt,
      isAutoNamed: workspace.isAutoNamed,
      company: workspace.company,
      _count: workspace._count
    },
    effectiveRegion,
    projects: workspace.projects,
    keys: workspace.apiKeys,
    members: workspace.members.map((m) => ({
      id: m.id,
      role: m.role,
      companyRole: companyRoleByUserId.get(m.user.id) ?? null,
      user: m.user
    })),
    isCompanyOwnerAdmin: access.companyRole === 'OWNER' || access.companyRole === 'ADMIN',
    isCompanyBilling: access.companyRole === 'BILLING',
    effectiveRole,
    canWrite: access.canWrite,
    canAdmin: access.canAdmin,
    regionLocked: workspace.apiWorkspaceId != null,
    isArchived
  };
}
