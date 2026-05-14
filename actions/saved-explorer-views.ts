'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AuditAction } from '@/generated/prisma/client';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import {
  createSavedExplorerView,
  deleteSavedExplorerView,
  runSavedExplorerView,
  updateSavedExplorerView,
} from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import { trackSavedExplorerViewEvent } from '@/lib/analytics/saved-explorer-view-events';
import { auditSavedExplorerViewLog } from '@/lib/exports/audit-export-evidence';
import { explorerUrlStateFromEventQuery, sanitizeEventQueryForPersistence } from '@/lib/events/event-query';
import type { EventsExplorerUrlState } from '@/lib/events/explorer-url';
import { isCompanyAdmin, listWorkspacesForUser } from '@/lib/workspaces/queries';
import type { CompanyRole } from '@/types/dashboard';

const uuid = z.string().uuid();

async function savedViewActor(session: Awaited<ReturnType<typeof requireDashboardAccess>>) {
  const companyId = session.company.id;
  const companyRole = session.userCompany.role as CompanyRole;

  let exportWorkspaceIds: string[] | undefined;
  if (!isCompanyAdmin(companyRole)) {
    const workspaces = await listWorkspacesForUser(session.user.id);
    exportWorkspaceIds = workspaces
      .filter((w) => w.companyId === companyId)
      .map((w) => w.apiWorkspaceId)
      .filter((id): id is string => Boolean(id));
  }

  return {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: companyRole,
    companyId,
    ...(exportWorkspaceIds?.length ? { exportWorkspaceIds } : {}),
  };
}

export async function runSavedExplorerViewAction(viewId: string): Promise<
  | { ok: true; explorerState: EventsExplorerUrlState }
  | { ok: false; error: string }
> {
  const session = await requireDashboardAccess('/events');
  if (!isHyreLogApiConfigured()) {
    return { ok: false, error: 'API not configured' };
  }
  const id = viewId.trim();
  if (!uuid.safeParse(id).success) {
    return { ok: false, error: 'Invalid view id' };
  }
  try {
    const actor = await savedViewActor(session);
    const data = await runSavedExplorerView(id, actor);
    const explorerState = explorerUrlStateFromEventQuery(sanitizeEventQueryForPersistence(data.query), {
      savedExplorerViewId: data.view.id,
    });
    trackSavedExplorerViewEvent('saved_view_run', { viewId: data.view.id });
    await auditSavedExplorerViewLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.SAVED_VIEW_RUN,
      viewId: data.view.id,
      details: { name: data.view.name },
    });
    return { ok: true, explorerState };
  } catch {
    return { ok: false, error: 'Failed to run saved view' };
  }
}

const createBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  workspaceId: z.union([z.string().uuid(), z.null()]).optional(),
  query: z.unknown(),
});

export async function createSavedExplorerViewAction(
  payload: unknown
): Promise<{ ok: true; viewId: string } | { ok: false; error: string }> {
  const session = await requireDashboardAccess('/events');
  if (!isHyreLogApiConfigured()) {
    return { ok: false, error: 'API not configured' };
  }
  const parsed = createBodySchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request' };
  }
  try {
    const actor = await savedViewActor(session);
    const out = await createSavedExplorerView(
      {
        name: parsed.data.name,
        description: parsed.data.description,
        workspaceId: parsed.data.workspaceId,
        query: parsed.data.query,
      },
      actor
    );
    trackSavedExplorerViewEvent('saved_view_created', { viewId: out.view.id });
    await auditSavedExplorerViewLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.SAVED_VIEW_CREATED,
      viewId: out.view.id,
      details: { name: out.view.name },
    });
    revalidatePath('/events');
    return { ok: true, viewId: out.view.id };
  } catch {
    return { ok: false, error: 'Failed to save view' };
  }
}

const patchBodySchema = z.object({
  viewId: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  workspaceId: z.union([z.string().uuid(), z.null()]).optional(),
  query: z.unknown().optional(),
});

export async function updateSavedExplorerViewAction(
  payload: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireDashboardAccess('/events');
  if (!isHyreLogApiConfigured()) {
    return { ok: false, error: 'API not configured' };
  }
  const parsed = patchBodySchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request' };
  }
  try {
    const actor = await savedViewActor(session);
    const { viewId, ...body } = parsed.data;
    await updateSavedExplorerView(viewId, body, actor);
    trackSavedExplorerViewEvent('saved_view_updated', { viewId });
    await auditSavedExplorerViewLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.SAVED_VIEW_UPDATED,
      viewId,
    });
    revalidatePath('/events');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to update view' };
  }
}

export async function deleteSavedExplorerViewAction(
  viewId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireDashboardAccess('/events');
  if (!isHyreLogApiConfigured()) {
    return { ok: false, error: 'API not configured' };
  }
  const id = viewId.trim();
  if (!uuid.safeParse(id).success) {
    return { ok: false, error: 'Invalid view id' };
  }
  try {
    const actor = await savedViewActor(session);
    await deleteSavedExplorerView(id, actor);
    trackSavedExplorerViewEvent('saved_view_deleted', { viewId: id });
    await auditSavedExplorerViewLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.SAVED_VIEW_DELETED,
      viewId: id,
    });
    revalidatePath('/events');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to delete view' };
  }
}
