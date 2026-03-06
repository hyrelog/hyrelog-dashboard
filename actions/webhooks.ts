'use server';

import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getDashboardWebhooks } from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';

export async function getWebhooksAction() {
  const session = await requireDashboardAccess('/webhooks');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured', webhooks: [] };
  }

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: (session as { userCompany: { role: string } }).userCompany.role,
    companyId: (session as { company: { id: string } }).company.id,
  };

  try {
    const data = await getDashboardWebhooks(actor);
    return { ok: true as const, webhooks: data.webhooks };
  } catch (err) {
    console.error('getWebhooksAction:', err);
    return { ok: false as const, error: 'Failed to load webhooks', webhooks: [] };
  }
}
