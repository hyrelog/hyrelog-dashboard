import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getEventsAction, getEventsFilterOptionsAction } from '@/actions/events';
import { EventsExplorerContent } from './EventsExplorerContent';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import { prisma } from '@/lib/prisma';

const INITIAL_PAGE_SIZE = 10;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const session = await requireDashboardAccess('/events');
  const companyId = (session as { company: { id: string } }).company.id;

  const sp = await searchParams;
  const rawWs = typeof sp.workspaceId === 'string' ? sp.workspaceId.trim() : '';
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let initialWorkspaceApiId: string | null = null;
  if (rawWs && uuidRe.test(rawWs)) {
    const row = await prisma.workspace.findFirst({
      where: { id: rawWs, companyId, deletedAt: null },
      select: { apiWorkspaceId: true },
    });
    initialWorkspaceApiId = row?.apiWorkspaceId ?? null;
  }

  const [initial, filterOpts, workspaces] = await Promise.all([
    getEventsAction({
      limit: INITIAL_PAGE_SIZE,
      offset: 0,
      sort: 'timestamp',
      order: 'desc',
      ...(initialWorkspaceApiId ? { workspaceId: initialWorkspaceApiId } : {}),
    }),
    getEventsFilterOptionsAction(
      initialWorkspaceApiId ? { workspaceId: initialWorkspaceApiId } : {}
    ),
    prisma.workspace.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, name: true, apiWorkspaceId: true },
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
      initialWorkspaceApiId={initialWorkspaceApiId}
      apiConfigured={apiConfigured}
    />
  );
}
