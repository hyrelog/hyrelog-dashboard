import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getEventsAction, getEventsFilterOptionsAction } from '@/actions/events';
import { EventsExplorerContent } from './EventsExplorerContent';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import { prisma } from '@/lib/prisma';

const INITIAL_PAGE_SIZE = 10;

export default async function EventsPage() {
  const session = await requireDashboardAccess('/events');
  const companyId = (session as { company: { id: string } }).company.id;

  const [initial, filterOpts, workspaces] = await Promise.all([
    getEventsAction({
      limit: INITIAL_PAGE_SIZE,
      offset: 0,
      sort: 'timestamp',
      order: 'desc',
    }),
    getEventsFilterOptionsAction({}),
    prisma.workspace.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  const apiConfigured = isHyreLogApiConfigured();

  return (
    <EventsExplorerContent
      initialEvents={initial.ok ? initial.events : []}
      initialTotal={initial.ok ? initial.total : 0}
      initialCategories={filterOpts.ok ? filterOpts.categories : []}
      initialActions={filterOpts.ok ? filterOpts.actions : []}
      initialError={
        initial.ok
          ? filterOpts.ok
            ? null
            : filterOpts.error
          : initial.error
      }
      workspaces={workspaces}
      apiConfigured={apiConfigured}
    />
  );
}
