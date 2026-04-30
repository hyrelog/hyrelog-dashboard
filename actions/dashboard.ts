import { prisma } from '@/lib/prisma';
import { listWorkspacesForCompany, listWorkspacesForUser } from '@/lib/workspaces/queries';
import type { Member, Project } from '@/types/dashboard';
import type { CompanyRole, ProjectEnvironment } from '@/generated/prisma/client';

const ADMIN_ROLES: CompanyRole[] = ['OWNER', 'ADMIN', 'BILLING'];

export function isCompanyAdmin(role: CompanyRole) {
  return ADMIN_ROLES.includes(role);
}

function mapProjectEnvironment(env: ProjectEnvironment): Project['environment'] {
  if (env === 'PRODUCTION') return 'production';
  if (env === 'STAGING') return 'staging';
  return 'development';
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Dashboard home: projects visible to this user across their workspaces, and company-scoped member list (+ pending company invites) for admins only.
 */
export async function getDashboardHomeData(options: {
  companyId: string;
  userId: string;
  isCompanyAdmin: boolean;
}): Promise<{ projects: Project[]; members: Member[] }> {
  const { companyId, userId, isCompanyAdmin } = options;

  const workspaceRows = isCompanyAdmin ? await listWorkspacesForCompany(companyId) : await listWorkspacesForUser(userId);
  const workspaceIds = workspaceRows.map((w) => w.id);

  const projectsPromise =
    workspaceIds.length === 0
      ? Promise.resolve([])
      : prisma.project.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            deletedAt: null,
            status: 'ACTIVE'
          },
          orderBy: [{ workspaceId: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            environment: true,
            workspaceId: true
          }
        });

  const membersPromise = isCompanyAdmin
    ? Promise.all([
        prisma.companyMember.findMany({
          where: { companyId },
          orderBy: { user: { email: 'asc' } },
          select: {
            userId: true,
            role: true,
            createdAt: true,
            user: { select: { email: true, firstName: true, lastName: true } }
          }
        }),
        prisma.invite.findMany({
          where: {
            companyId,
            status: 'PENDING',
            scope: 'COMPANY'
          },
          orderBy: { emailNormalized: 'asc' },
          select: {
            id: true,
            email: true,
            companyRole: true,
            createdAt: true
          }
        })
      ])
    : Promise.resolve([[], []] as const);

  const [projectRows, membersBundle] = await Promise.all([projectsPromise, membersPromise]);

  const projects: Project[] = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    environment: mapProjectEnvironment(p.environment),
    workspaceId: p.workspaceId
  }));

  if (!isCompanyAdmin) {
    return { projects, members: [] };
  }

  const [companyMemberRows, pendingInvites] = membersBundle;

  const activeMembers: Member[] = companyMemberRows.map((row) => ({
    id: row.userId,
    email: row.user.email,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    role: row.role as Member['role'],
    status: 'ACTIVE',
    joinedAt: isoDateOnly(row.createdAt)
  }));

  const pendingMembers: Member[] = pendingInvites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    firstName: '',
    lastName: '',
    role: (inv.companyRole ?? 'MEMBER') as Member['role'],
    status: 'PENDING',
    joinedAt: isoDateOnly(inv.createdAt)
  }));

  return {
    projects,
    members: [...activeMembers, ...pendingMembers]
  };
}

// Company admin dashboard data
export async function getCompanyDashboardData(companyId: string) {
  const workspaces = await prisma.workspace.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      preferredRegion: true,
      _count: { select: { members: true } }
    }
  });

  const memberCount = await prisma.companyMember.count({
    where: { companyId }
  });

  const pendingInvites = await prisma.invite.count({
    where: { companyId, status: 'PENDING' }
  });

  return { workspaces, memberCount, pendingInvites };
}

// Workspace user dashboard data (default workspace alphabetically)
export async function getWorkspaceUserDashboardData(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, workspace: { deletedAt: null } },
    select: {
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          preferredRegion: true,
          company: { select: { name: true } },
          _count: { select: { members: true } }
        }
      }
    }
  });

  const workspaces = memberships
    .map((m) => m.workspace)
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const defaultWorkspace = workspaces[0] ?? null;

  return { defaultWorkspace, workspaces };
}
