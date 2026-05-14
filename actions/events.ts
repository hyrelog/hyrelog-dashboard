'use server';

import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import {
  getDashboardEvents,
  getDashboardEventFilterOptions,
  type DashboardEventsParams,
  type DashboardEventFilterOptionsParams,
} from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import type { CompanyRole } from '@/types/dashboard';
import { resolveExplorerHyrelogWorkspace } from '@/lib/events/resolve-explorer-workspace';
import { dashboardLog } from '@/lib/dashboard-logger';

function actorFromSession(session: Awaited<ReturnType<typeof requireDashboardAccess>>) {
  return {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: (session as { userCompany: { role: string } }).userCompany.role,
    companyId: (session as { company: { id: string } }).company.id,
  };
}

export type DashboardEventsClientParams = Omit<DashboardEventsParams, 'workspaceId'> & {
  /**
   * Dashboard (Prisma) workspace id from URL/UI — resolved server-side to HyreLog `workspaceId`.
   * Never pass raw HyreLog workspace ids from the client.
   */
  dashboardWorkspaceId?: string | null;
};

async function resolveHyrelogWorkspaceId(
  session: Awaited<ReturnType<typeof requireDashboardAccess>>,
  dashboardWorkspaceId?: string | null
) {
  const companyId = (session as { company: { id: string } }).company.id;
  const companyRole = (session as { userCompany: { role: CompanyRole } }).userCompany.role;
  return resolveExplorerHyrelogWorkspace({
    companyId,
    userId: session.user.id,
    companyRole,
    dashboardWorkspaceIdFromUrl: dashboardWorkspaceId?.trim() || null,
  });
}

export async function getEventsAction(params: DashboardEventsClientParams) {
  const session = await requireDashboardAccess('/events');
  if (!isHyreLogApiConfigured()) {
    return {
      ok: false as const,
      error: 'API not configured',
      events: [] as Awaited<ReturnType<typeof getDashboardEvents>>['events'],
      total: 0,
    };
  }

  const actor = actorFromSession(session);
  const { dashboardWorkspaceId, ...rest } = params;

  const resolved = await resolveHyrelogWorkspaceId(session, dashboardWorkspaceId);
  if (!resolved.ok) {
    return {
      ok: false as const,
      error: resolved.error,
      events: [] as Awaited<ReturnType<typeof getDashboardEvents>>['events'],
      total: 0,
    };
  }

  const hyrelogParams: DashboardEventsParams = {
    ...rest,
    ...(resolved.hyrelogWorkspaceId ? { workspaceId: resolved.hyrelogWorkspaceId } : {}),
  };

  try {
    const data = await getDashboardEvents(hyrelogParams, actor);
    return { ok: true as const, events: data.events, total: data.total };
  } catch (err) {
    dashboardLog.error('getEventsAction_failed', {
      reason: err instanceof Error ? err.name : 'unknown',
    });
    return {
      ok: false as const,
      error: 'Failed to load events',
      events: [] as Awaited<ReturnType<typeof getDashboardEvents>>['events'],
      total: 0,
    };
  }
}

export type DashboardEventFilterOptionsClientParams = Omit<DashboardEventFilterOptionsParams, 'workspaceId'> & {
  dashboardWorkspaceId?: string | null;
};

export async function getEventsFilterOptionsAction(params: DashboardEventFilterOptionsClientParams) {
  const session = await requireDashboardAccess('/events');
  if (!isHyreLogApiConfigured()) {
    return {
      ok: false as const,
      error: 'API not configured',
      categories: [] as string[],
      actions: [] as string[],
    };
  }

  const actor = actorFromSession(session);
  const { dashboardWorkspaceId, ...rest } = params;

  const resolved = await resolveHyrelogWorkspaceId(session, dashboardWorkspaceId);
  if (!resolved.ok) {
    return {
      ok: false as const,
      error: resolved.error,
      categories: [] as string[],
      actions: [] as string[],
    };
  }

  const hyrelogParams: DashboardEventFilterOptionsParams = {
    ...rest,
    ...(resolved.hyrelogWorkspaceId ? { workspaceId: resolved.hyrelogWorkspaceId } : {}),
  };

  try {
    const data = await getDashboardEventFilterOptions(hyrelogParams, actor);
    return { ok: true as const, categories: data.categories, actions: data.actions };
  } catch (err) {
    dashboardLog.error('getEventsFilterOptionsAction_failed', {
      reason: err instanceof Error ? err.name : 'unknown',
    });
    return {
      ok: false as const,
      error: 'Failed to load filter options',
      categories: [] as string[],
      actions: [] as string[],
    };
  }
}
