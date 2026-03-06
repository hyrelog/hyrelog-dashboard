import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getEventsAction } from '@/actions/events';
import { EventsExplorerContent } from './EventsExplorerContent';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import { prisma } from '@/lib/prisma';

export default async function EventsPage() {
  const session = await requireDashboardAccess('/events');
  const companyId = (session as { company: { id: string } }).company.id;

  const initial = await getEventsAction({ limit: 20 });
  const workspaces = await prisma.workspace.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, name: true },
  });
  const apiConfigured = isHyreLogApiConfigured();

  return (
    <EventsExplorerContent
      initialEvents={initial.ok ? initial.events : []}
      initialNextCursor={initial.ok ? initial.nextCursor : null}
      initialError={initial.ok ? null : initial.error}
      workspaces={workspaces}
      apiConfigured={apiConfigured}
    />
  );
}
