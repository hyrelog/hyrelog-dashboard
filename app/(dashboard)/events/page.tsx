import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getEventsAction, getEventsFilterOptionsAction } from '@/actions/events';
import { EventsExplorerContent } from './EventsExplorerContent';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import { getDashboardExportCapabilities, getSavedExplorerViews, type SavedExplorerViewSummary } from '@/lib/hyrelog-api';
import { computeExplorerExportButtonState } from '@/lib/hyrelog-api/dashboard-filtered-export-compat';
import {
  listWorkspacesForCompany,
  listWorkspacesForUser,
  isCompanyAdmin,
} from '@/lib/workspaces/queries';
import type { CompanyRole } from '@/types/dashboard';
import {
  flattenExplorerSearchParamsForSchema,
  parseEventsExplorerSearchParamsFromFlat,
  type EventsExplorerUrlState,
} from '@/lib/events/explorer-url';
import { resolveExplorerHyrelogWorkspace } from '@/lib/events/resolve-explorer-workspace';
import { eventsExplorerQuerySchema } from '@/schemas/events';

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireDashboardAccess('/events');
  const companyId = session.company.id;
  const companyRole = session.userCompany.role as CompanyRole;

  const sp = await searchParams;
  const explorerQueryFlat = flattenExplorerSearchParamsForSchema(sp);
  void eventsExplorerQuerySchema.safeParse(explorerQueryFlat);
  const urlState = parseEventsExplorerSearchParamsFromFlat(explorerQueryFlat);

  const workspaces = isCompanyAdmin(companyRole)
    ? await listWorkspacesForCompany(companyId)
    : (await listWorkspacesForUser(session.user.id)).filter((w) => w.companyId === companyId);

  const explorerWorkspaces = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    apiWorkspaceId: w.apiWorkspaceId,
  }));

  const resolved = await resolveExplorerHyrelogWorkspace({
    companyId,
    userId: session.user.id,
    companyRole,
    dashboardWorkspaceIdFromUrl: urlState.dashboardWorkspaceId || null,
  });

  let initialExplorerState: EventsExplorerUrlState = { ...urlState };
  let scopeError: string | null = null;

  if (!resolved.ok) {
    scopeError = resolved.error;
    if (resolved.code === 'INVALID_WORKSPACE') {
      initialExplorerState = { ...urlState, dashboardWorkspaceId: '', page: 1 };
    }
  } else {
    initialExplorerState = {
      ...urlState,
      dashboardWorkspaceId:
        urlState.dashboardWorkspaceId || resolved.effectiveDashboardWorkspaceId || '',
    };
  }

  const apiConfigured = isHyreLogApiConfigured();

  /**
   * Filtered exports need hyrelog-api deployed with POST /dashboard/exports and
   * GET /dashboard/exports/capabilities (see parallel capability probe below).
   */
  const exportCapabilityActor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: companyRole,
    companyId,
  };

  let initialEvents: Awaited<ReturnType<typeof getEventsAction>>['events'] = [];
  let initialTotal = 0;
  let initialCategories: string[] = [];
  let initialActions: string[] = [];
  let initialError: string | null = null;
  let filteredExportsAvailable = true;

  if (apiConfigured && resolved.ok) {
    const effectiveDashboardId = initialExplorerState.dashboardWorkspaceId || null;
    const listQuery = {
      dashboardWorkspaceId: effectiveDashboardId,
      ...(initialExplorerState.from ? { from: initialExplorerState.from } : {}),
      ...(initialExplorerState.to ? { to: initialExplorerState.to } : {}),
      ...(initialExplorerState.category ? { category: initialExplorerState.category } : {}),
      ...(initialExplorerState.action ? { action: initialExplorerState.action } : {}),
    };

    const offset = (initialExplorerState.page - 1) * initialExplorerState.pageSize;

    const capPromise = getDashboardExportCapabilities(exportCapabilityActor)
      .then((c) => c.createFilteredExport === true)
      .catch(() => false);

    const [initial, filterOpts, capOk] = await Promise.all([
      getEventsAction({
        limit: initialExplorerState.pageSize,
        offset,
        sort: initialExplorerState.sort,
        order: initialExplorerState.order,
        ...listQuery,
      }),
      getEventsFilterOptionsAction({
        ...(initialExplorerState.from ? { from: initialExplorerState.from } : {}),
        ...(initialExplorerState.to ? { to: initialExplorerState.to } : {}),
        dashboardWorkspaceId: effectiveDashboardId,
      }),
      capPromise,
    ]);

    filteredExportsAvailable = capOk;

    if (initial.ok) {
      initialEvents = initial.events;
      initialTotal = initial.total;
    } else {
      initialError = initial.error ?? 'Failed to load events';
    }
    if (filterOpts.ok) {
      initialCategories = filterOpts.categories;
      initialActions = filterOpts.actions;
    } else if (!initialError) {
      initialError = filterOpts.error ?? 'Failed to load filter options';
    }
  }

  const exportButton = computeExplorerExportButtonState({
    apiConfigured,
    resolvedOk: resolved.ok,
    scopeError,
    filteredExportsAvailable,
  });

  const exportHyrelogWorkspaceId = resolved.ok ? resolved.hyrelogWorkspaceId : null;

  let savedExplorerViews: SavedExplorerViewSummary[] = [];
  if (apiConfigured) {
    let exportWorkspaceIds: string[] | undefined;
    if (!isCompanyAdmin(companyRole)) {
      const wl = await listWorkspacesForUser(session.user.id);
      exportWorkspaceIds = wl
        .filter((w) => w.companyId === companyId)
        .map((w) => w.apiWorkspaceId)
        .filter((id): id is string => Boolean(id));
    }
    const listActor = {
      userId: session.user.id,
      userEmail: (session.user as { email?: string }).email ?? '',
      userRole: companyRole,
      companyId,
      ...(exportWorkspaceIds?.length ? { exportWorkspaceIds } : {}),
    };
    try {
      const listed = await getSavedExplorerViews(listActor);
      savedExplorerViews = listed.views;
    } catch {
      savedExplorerViews = [];
    }
  }

  const elevatedSavedViewMutations =
    companyRole === 'OWNER' || companyRole === 'ADMIN' || companyRole === 'BILLING';

  return (
    <EventsExplorerContent
      companyRole={companyRole}
      initialEvents={initialEvents}
      initialTotal={initialTotal}
      initialCategories={initialCategories}
      initialActions={initialActions}
      initialError={scopeError ?? initialError}
      workspaces={explorerWorkspaces}
      initialExplorerState={initialExplorerState}
      apiConfigured={apiConfigured}
      exportHyrelogWorkspaceId={exportHyrelogWorkspaceId}
      exportDisabled={exportButton.disabled}
      exportDisabledReason={exportButton.reason}
      savedExplorerViews={savedExplorerViews}
      currentUserId={session.user.id}
      elevatedSavedViewMutations={elevatedSavedViewMutations}
    />
  );
}
