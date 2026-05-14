import { prisma } from '@/lib/prisma';
import type { CompanyRole } from '@/types/dashboard';
import { isCompanyLevelRole } from '@/lib/dashboard/types';
import { listWorkspacesForUser } from '@/lib/workspaces/queries';

export type ResolveExplorerWorkspaceCode =
  | 'NO_MEMBERSHIPS'
  | 'INVALID_WORKSPACE'
  | 'WORKSPACE_REQUIRED'
  | 'NOT_PROVISIONED';

export type ResolveExplorerWorkspaceResult =
  | {
      ok: true;
      /** HyreLog list `workspaceId` query param, or null for company-wide (admins only). */
      hyrelogWorkspaceId: string | null;
      /** Effective dashboard workspace id after implicit defaults (for UI chips). */
      effectiveDashboardWorkspaceId: string | null;
    }
  | { ok: false; error: string; code: ResolveExplorerWorkspaceCode };

/**
 * Map optional dashboard workspace id from the URL into a HyreLog workspace id.
 * Enforces company + membership boundaries; never trusts client-supplied HyreLog ids.
 */
export async function resolveExplorerHyrelogWorkspace(opts: {
  companyId: string;
  userId: string;
  companyRole: CompanyRole;
  dashboardWorkspaceIdFromUrl: string | null;
}): Promise<ResolveExplorerWorkspaceResult> {
  const { companyId, userId, companyRole, dashboardWorkspaceIdFromUrl } = opts;
  const urlId = dashboardWorkspaceIdFromUrl?.trim() || null;

  if (isCompanyLevelRole(companyRole)) {
    if (!urlId) {
      return { ok: true, hyrelogWorkspaceId: null, effectiveDashboardWorkspaceId: null };
    }
    const row = await prisma.workspace.findFirst({
      where: { id: urlId, companyId, deletedAt: null },
      select: { id: true, apiWorkspaceId: true },
    });
    if (!row) {
      return { ok: false, error: 'Workspace not found or not accessible.', code: 'INVALID_WORKSPACE' };
    }
    if (!row.apiWorkspaceId) {
      return { ok: false, error: 'Workspace is not provisioned for events yet.', code: 'NOT_PROVISIONED' };
    }
    return {
      ok: true,
      hyrelogWorkspaceId: row.apiWorkspaceId,
      effectiveDashboardWorkspaceId: row.id,
    };
  }

  const memberships = await listWorkspacesForUser(userId);
  const allowed = memberships.filter((w) => w.companyId === companyId);
  if (allowed.length === 0) {
    return {
      ok: false,
      error: 'You do not have access to any workspace in this company.',
      code: 'NO_MEMBERSHIPS',
    };
  }

  const allowedById = new Map(allowed.map((w) => [w.id, w]));

  if (urlId) {
    const ws = allowedById.get(urlId);
    if (!ws) {
      return { ok: false, error: 'Workspace not found or not accessible.', code: 'INVALID_WORKSPACE' };
    }
    const row = await prisma.workspace.findFirst({
      where: { id: urlId, companyId, deletedAt: null },
      select: { id: true, apiWorkspaceId: true },
    });
    if (!row?.apiWorkspaceId) {
      return { ok: false, error: 'Workspace is not provisioned for events yet.', code: 'NOT_PROVISIONED' };
    }
    return {
      ok: true,
      hyrelogWorkspaceId: row.apiWorkspaceId,
      effectiveDashboardWorkspaceId: row.id,
    };
  }

  if (allowed.length === 1) {
    const only = allowed[0];
    const row = await prisma.workspace.findFirst({
      where: { id: only.id, companyId, deletedAt: null },
      select: { id: true, apiWorkspaceId: true },
    });
    if (!row?.apiWorkspaceId) {
      return { ok: false, error: 'Workspace is not provisioned for events yet.', code: 'NOT_PROVISIONED' };
    }
    return {
      ok: true,
      hyrelogWorkspaceId: row.apiWorkspaceId,
      effectiveDashboardWorkspaceId: row.id,
    };
  }

  return {
    ok: false,
    error: 'Select a workspace to investigate events.',
    code: 'WORKSPACE_REQUIRED',
  };
}
