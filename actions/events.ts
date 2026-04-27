'use server';

import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import {
  getDashboardEvents,
  getDashboardEventFilterOptions,
  type DashboardEventsParams,
  type DashboardEventFilterOptionsParams,
} from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';

function actorFromSession(session: Awaited<ReturnType<typeof requireDashboardAccess>>) {
  return {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: (session as { userCompany: { role: string } }).userCompany.role,
    companyId: (session as { company: { id: string } }).company.id,
  };
}

export async function getEventsAction(params: DashboardEventsParams) {
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

  try {
    const data = await getDashboardEvents(params, actor);
    return { ok: true as const, events: data.events, total: data.total };
  } catch (err) {
    console.error('getEventsAction:', err);
    return {
      ok: false as const,
      error: 'Failed to load events',
      events: [] as Awaited<ReturnType<typeof getDashboardEvents>>['events'],
      total: 0,
    };
  }
}

export async function getEventsFilterOptionsAction(params: DashboardEventFilterOptionsParams) {
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

  try {
    const data = await getDashboardEventFilterOptions(params, actor);
    return { ok: true as const, categories: data.categories, actions: data.actions };
  } catch (err) {
    console.error('getEventsFilterOptionsAction:', err);
    return {
      ok: false as const,
      error: 'Failed to load filter options',
      categories: [] as string[],
      actions: [] as string[],
    };
  }
}
