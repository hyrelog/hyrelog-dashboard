'use server';

/**
 * Provisioning orchestrators: dashboard writes first, then call HyreLog API and store returned IDs.
 * Requires HYRELOG_API_URL, DASHBOARD_SERVICE_TOKEN. For key sync also HYRELOG_API_KEY_SECRET.
 */

import { prisma } from '@/lib/prisma';
import { DataRegion, Prisma } from '@/generated/prisma/client';
import {
  isHyreLogApiConfigured,
  toApiDataRegion,
  provisionCompany as apiProvisionCompany,
  provisionWorkspace as apiProvisionWorkspace,
  getCompany as apiGetCompany,
  getWorkspace as apiGetWorkspace,
  syncApiKey as apiSyncApiKey,
  revokeApiKey as apiRevokeApiKey,
  archiveWorkspace as apiArchiveWorkspace,
  restoreWorkspace as apiRestoreWorkspace,
  type ActorHeaders,
} from '@/lib/hyrelog-api';
import { generateApiFormatKey, hashApiKeyForSync, isApiKeySyncConfigured } from '@/lib/hyrelog-api/key-format';

function actorFrom(userId: string, userEmail: string | null, userRole: string, companyId: string): ActorHeaders {
  return { userId, userEmail: userEmail ?? undefined, userRole, companyId };
}

export type ProvisionCompanyAndStoreOptions = {
  /**
   * When set (e.g. a workspace was just created with a region), use this to pick the API
   * `dataRegion` and sync `Company.preferredRegion`. Otherwise the company row default (often US) wins.
   */
  dataRegionForProvision?: string | null;
};

/**
 * Call after company exists in dashboard DB. Provisions company in API and sets company.apiCompanyId.
 */
export async function provisionCompanyAndStore(
  dashboardCompanyId: string,
  actor?: { userId: string; userEmail: string | null; userRole: string },
  options?: ProvisionCompanyAndStoreOptions
): Promise<{ ok: true; apiCompanyId: string } | { ok: false; error: string }> {
  if (!isHyreLogApiConfigured()) {
    return { ok: false, error: 'HyreLog API not configured' };
  }

  const company = await prisma.company.findUnique({
    where: { id: dashboardCompanyId },
    select: { id: true, slug: true, name: true, preferredRegion: true, apiCompanyId: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };
  if (company.apiCompanyId) return { ok: true, apiCompanyId: company.apiCompanyId };

  const override = options?.dataRegionForProvision;
  const dataRegion = override?.trim()
    ? toApiDataRegion(override)
    : toApiDataRegion(company.preferredRegion);

  if (override?.trim()) {
    const sync = dataRegion as DataRegion;
    await prisma.company.update({
      where: { id: company.id },
      data: { preferredRegion: sync },
    });
  }
  const actorHeaders = actor ? actorFrom(actor.userId, actor.userEmail, actor.userRole, company.id) : undefined;

  try {
    const res = await apiProvisionCompany({
      dashboardCompanyId: company.id,
      slug: company.slug,
      name: company.name,
      dataRegion,
      actor: actorHeaders,
    });
    await prisma.company.update({
      where: { id: company.id },
      data: { apiCompanyId: res.apiCompanyId },
    });
    return { ok: true, apiCompanyId: res.apiCompanyId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Call after workspace exists in dashboard DB. Company must be provisioned first (or we provision company then workspace).
 * Sets workspace.apiWorkspaceId.
 */
export async function provisionWorkspaceAndStore(
  dashboardWorkspaceId: string,
  actor?: { userId: string; userEmail: string | null; userRole: string }
): Promise<{ ok: true; apiWorkspaceId: string } | { ok: false; error: string }> {
  if (!isHyreLogApiConfigured()) {
    return { ok: false, error: 'HyreLog API not configured' };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: dashboardWorkspaceId },
    select: {
      id: true,
      companyId: true,
      slug: true,
      name: true,
      preferredRegion: true,
      apiWorkspaceId: true,
      company: { select: { id: true, apiCompanyId: true } },
    },
  });
  if (!workspace) return { ok: false, error: 'Workspace not found' };
  if (workspace.apiWorkspaceId) return { ok: true, apiWorkspaceId: workspace.apiWorkspaceId };

  if (!workspace.company.apiCompanyId) {
    const prov = await provisionCompanyAndStore(workspace.companyId, actor, {
      dataRegionForProvision: workspace.preferredRegion,
    });
    if (!prov.ok) return prov;
  }

  const company = await prisma.company.findUnique({
    where: { id: workspace.companyId },
    select: { apiCompanyId: true },
  });
  if (!company?.apiCompanyId) return { ok: false, error: 'Company not provisioned' };

  const actorHeaders = actor ? actorFrom(actor.userId, actor.userEmail, actor.userRole, workspace.companyId) : undefined;

  try {
    const res = await apiProvisionWorkspace({
      dashboardWorkspaceId: workspace.id,
      dashboardCompanyId: workspace.companyId,
      slug: workspace.slug,
      name: workspace.name,
      actor: actorHeaders,
    });
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { apiWorkspaceId: res.apiWorkspaceId },
    });
    return { ok: true, apiWorkspaceId: res.apiWorkspaceId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * After creating a key in dashboard DB, sync it to the API (workspace must be provisioned).
 * Key must be in API format (use createKeyAndSync for full flow) or pass prefix + hash from API-format key.
 */
export async function syncKeyAfterCreate(
  dashboardKeyId: string,
  actor?: { userId: string; userEmail: string | null; userRole: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isHyreLogApiConfigured() || !isApiKeySyncConfigured()) {
    return { ok: false, error: 'API key sync not configured' };
  }

  const key = await prisma.workspaceApiKey.findUnique({
    where: { id: dashboardKeyId },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      prefix: true,
      hash: true,
      workspace: {
        select: {
          companyId: true,
          company: { select: { apiCompanyId: true } },
          apiWorkspaceId: true,
        },
      },
    },
  });
  if (!key) return { ok: false, error: 'Key not found' };
  if (!key.workspace.apiWorkspaceId || !key.workspace.company.apiCompanyId) {
    return { ok: false, error: 'Workspace must be provisioned before syncing keys' };
  }
  if (!key.prefix.startsWith('hlk_')) {
    return { ok: false, error: 'Key must be in API format (hlk_region_ws_...) to sync' };
  }

  const actorHeaders = actor ? actorFrom(actor.userId, actor.userEmail, actor.userRole, key.workspace.companyId) : undefined;

  try {
    await apiSyncApiKey({
      dashboardKeyId: key.id,
      scope: 'ws',
      dashboardCompanyId: key.workspace.companyId,
      dashboardWorkspaceId: key.workspaceId,
      name: key.name,
      prefix: key.prefix,
      hash: key.hash,
      actor: actorHeaders,
    });
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/**
 * Revoke key in dashboard then call API revoke.
 */
export async function revokeKeyAndSync(
  dashboardKeyId: string,
  actor?: { userId: string; userEmail: string | null; userRole: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = await prisma.workspaceApiKey.findUnique({
    where: { id: dashboardKeyId },
    select: { id: true, workspaceId: true, revokedAt: true, workspace: { select: { companyId: true } } },
  });
  if (!key) return { ok: false, error: 'Key not found' };

  const revokedAt = new Date();

  await prisma.workspaceApiKey.update({
    where: { id: key.id },
    data: { revokedAt },
  });

  if (!isHyreLogApiConfigured()) return { ok: true };

  const actorHeaders = actor ? actorFrom(actor.userId, actor.userEmail, actor.userRole, key.workspace.companyId) : undefined;
  try {
    await apiRevokeApiKey(key.id, revokedAt.toISOString(), actorHeaders);
  } catch {
    // Dashboard state is already updated; log but don't fail
  }
  return { ok: true };
}

/**
 * Archive workspace in dashboard then call API archive (revokes keys in API).
 */
export async function archiveWorkspaceAndSync(
  dashboardWorkspaceId: string,
  actor?: { userId: string; userEmail: string | null; userRole: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: dashboardWorkspaceId },
    select: { id: true, companyId: true, status: true, apiWorkspaceId: true },
  });
  if (!workspace) return { ok: false, error: 'Workspace not found' };
  if (workspace.status !== 'ACTIVE') return { ok: false, error: 'Workspace is not active' };

  const archivedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.workspaceApiKey.updateMany({
      where: { workspaceId: workspace.id, revokedAt: null },
      data: { revokedAt: archivedAt },
    });
    await tx.workspace.update({
      where: { id: workspace.id },
      data: { status: 'ARCHIVED' },
    });
  });

  if (isHyreLogApiConfigured() && workspace.apiWorkspaceId) {
    const actorHeaders = actor ? actorFrom(actor.userId, actor.userEmail, actor.userRole, workspace.companyId) : undefined;
    try {
      await apiArchiveWorkspace(
        workspace.id,
        { archivedAt: archivedAt.toISOString(), revokeAllKeys: true },
        actorHeaders
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Dashboard updated but API sync failed: ${message}` };
    }
  }
  return { ok: true };
}

/**
 * Restore workspace in dashboard then call API restore (does not un-revoke keys).
 */
export async function restoreWorkspaceAndSync(
  dashboardWorkspaceId: string,
  actor?: { userId: string; userEmail: string | null; userRole: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: dashboardWorkspaceId },
    select: { id: true, companyId: true, status: true, apiWorkspaceId: true },
  });
  if (!workspace) return { ok: false, error: 'Workspace not found' };
  if (workspace.status !== 'ARCHIVED') return { ok: false, error: 'Workspace is not archived' };

  const restoredAt = new Date();

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { status: 'ACTIVE' },
  });

  if (isHyreLogApiConfigured() && workspace.apiWorkspaceId) {
    const actorHeaders = actor ? actorFrom(actor.userId, actor.userEmail, actor.userRole, workspace.companyId) : undefined;
    try {
      await apiRestoreWorkspace(workspace.id, { restoredAt: restoredAt.toISOString() }, actorHeaders);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Dashboard updated but API sync failed: ${message}` };
    }
  }
  return { ok: true };
}

/**
 * Create API-format key in dashboard and sync to API. Use when workspace is provisioned.
 * Returns { fullKey, prefix } so caller can show fullKey once to the user.
 */
export async function createKeyAndSync(
  workspaceId: string,
  name: string,
  actor?: { userId: string; userEmail: string | null; userRole: string }
): Promise<
  | { ok: true; keyId: string; fullKey: string; prefix: string }
  | { ok: false; error: string }
> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      companyId: true,
      company: { select: { apiCompanyId: true } },
      apiWorkspaceId: true,
    },
  });
  if (!workspace) return { ok: false, error: 'Workspace not found' };
  if (!workspace.apiWorkspaceId || !workspace.company.apiCompanyId) {
    return { ok: false, error: 'Workspace must be provisioned first' };
  }
  if (!isApiKeySyncConfigured()) return { ok: false, error: 'API key sync not configured (HYRELOG_API_KEY_SECRET)' };

  const actorHeaders = actor ? actorFrom(actor.userId, actor.userEmail, actor.userRole, workspace.companyId) : undefined;

  let apiRegion: 'US' | 'EU' | 'UK' | 'AU';
  try {
    const company = await apiGetCompany(workspace.companyId, actorHeaders);
    if (!company.exists || !company.dataRegion) {
      return { ok: false, error: 'Provisioned API company not found during key sync' };
    }
    apiRegion = company.dataRegion as 'US' | 'EU' | 'UK' | 'AU';
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to load API company region for key sync: ${message}` };
  }

  const { fullKey, prefix } = generateApiFormatKey(apiRegion);
  const hash = hashApiKeyForSync(fullKey);

  let key: { id: string };
  try {
    key = await prisma.workspaceApiKey.create({
      data: { workspaceId, name: name.trim(), prefix, hash },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false, error: 'A key with this name already exists in this workspace.' };
    }
    throw err;
  }

  const sync = await syncKeyAfterCreate(key.id, actor);
  if (!sync.ok) {
    await prisma.workspaceApiKey.delete({ where: { id: key.id } }).catch(() => {});
    return { ok: false, error: sync.error };
  }

  return { ok: true, keyId: key.id, fullKey, prefix };
}
