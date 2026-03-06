'use server';

import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getDashboardExports } from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';

export async function getExportsAction() {
  const session = await requireDashboardAccess('/exports');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured', jobs: [] };
  }

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: (session as { userCompany: { role: string } }).userCompany.role,
    companyId: (session as { company: { id: string } }).company.id,
  };

  try {
    const data = await getDashboardExports(actor);
    return { ok: true as const, jobs: data.jobs };
  } catch (err) {
    console.error('getExportsAction:', err);
    return { ok: false as const, error: 'Failed to load exports', jobs: [] };
  }
}
