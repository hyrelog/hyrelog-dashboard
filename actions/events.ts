'use server';

import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getDashboardEvents, type DashboardEventsParams } from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';

export async function getEventsAction(params: DashboardEventsParams) {
  const session = await requireDashboardAccess('/events');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured', events: [], nextCursor: null };
  }

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: (session as { userCompany: { role: string } }).userCompany.role,
    companyId: (session as { company: { id: string } }).company.id,
  };

  try {
    const data = await getDashboardEvents(params, actor);
    return { ok: true as const, events: data.events, nextCursor: data.nextCursor };
  } catch (err) {
    console.error('getEventsAction:', err);
    return { ok: false as const, error: 'Failed to load events', events: [], nextCursor: null };
  }
}
