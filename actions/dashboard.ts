import { prisma } from '@/lib/prisma';
import { listWorkspacesForCompany } from '@/lib/workspaces/queries';
import type { Member, Project } from '@/types/dashboard';
import type { CompanyRole, ProjectEnvironment } from '@/generated/prisma/client';
import { getDashboardEvents } from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import type {
  DashboardChartDataSource,
  DashboardHomeInsights,
  DashboardPeriodComparison,
  DashboardSignals,
  EventVolumeRangeHistogram,
  EventVolumeRangeKey,
  EventVolumeRangeTotal,
  NativeGroupedWindowAnalytics,
} from '@/lib/dashboard/types';
import { isCompanyLevelRole } from '@/lib/dashboard/types';
import {
  aggregateGeoCounts,
  aggregateNamedCounts,
  takeTopNamedWithOther,
  volumeChartDisclaimer,
} from '@/lib/dashboard/metrics';
import { fetchEventVolumeHistograms } from '@/lib/dashboard/fetch-event-volume-histograms';
import { getCachedWorkspacesForDashboardUser } from '@/lib/dashboard/cached-workspaces';
import { fetchNativeGroupedWindowAnalytics } from '@/lib/dashboard/fetch-native-grouped-analytics';
import { deriveDashboardSignals } from '@/lib/dashboard/insights';
import { dashboardLog } from '@/lib/dashboard-logger';
import type { BillingInfo } from '@/types/dashboard';

const ADMIN_ROLES: CompanyRole[] = ['OWNER', 'ADMIN', 'BILLING'];

export function isCompanyAdmin(role: CompanyRole) {
  return ADMIN_ROLES.includes(role);
}

/**
 * Resolves `?workspace=` for the dashboard home: admins may omit (company overview) or pick any
 * company workspace; members must pick among memberships (invalid/absent → first workspace by name).
 */
export async function resolveDashboardHomeWorkspaceFocus(options: {
  companyId: string;
  userId: string;
  isCompanyAdmin: boolean;
  workspaceQuery?: string | null;
}): Promise<string | null> {
  const { companyId, userId, isCompanyAdmin, workspaceQuery } = options;
  const raw = typeof workspaceQuery === 'string' ? workspaceQuery.trim() : '';
  const requested = raw.length > 0 ? raw : null;

  if (isCompanyAdmin) {
    if (!requested) return null;
    const all = await listWorkspacesForCompany(companyId);
    return all.some((w) => w.id === requested) ? requested : null;
  }

  const memberWorkspaces = await getCachedWorkspacesForDashboardUser(userId);
  if (memberWorkspaces.length === 0) return null;
  const allowed = new Set(memberWorkspaces.map((w) => w.id));
  if (requested && allowed.has(requested)) return requested;
  return memberWorkspaces[0]?.id ?? null;
}

function mapProjectEnvironment(env: ProjectEnvironment): Project['environment'] {
  if (env === 'PRODUCTION') return 'production';
  if (env === 'STAGING') return 'staging';
  return 'development';
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Dashboard home: projects visible to this user across their workspaces, and company-scoped member list (+ pending company invites) for admins only.
 *
 * **Data sources:** `listWorkspacesForCompany` when admin (all workspaces), else `getCachedWorkspacesForDashboardUser` (memberships only).
 * Projects + members queries run in **parallel** via `Promise.all` when admin (projects + members bundle).
 */
export async function getDashboardHomeData(options: {
  companyId: string;
  userId: string;
  isCompanyAdmin: boolean;
  /** Dashboard workspace scope (Prisma workspace id). Admins: optional drill-down; members: must be in membership set. */
  focusWorkspaceDashboardId?: string | null;
}): Promise<{ projects: Project[]; members: Member[] }> {
  const { companyId, userId, isCompanyAdmin, focusWorkspaceDashboardId } = options;

  const workspaceRowsAll = isCompanyAdmin
    ? await listWorkspacesForCompany(companyId)
    : await getCachedWorkspacesForDashboardUser(userId);

  const workspaceRows =
    isCompanyAdmin && focusWorkspaceDashboardId
      ? workspaceRowsAll.filter((w) => w.id === focusWorkspaceDashboardId)
      : workspaceRowsAll;

  const workspaceIds = workspaceRows.map((w) => w.id);

  const projectsPromise =
    workspaceIds.length === 0
      ? Promise.resolve([])
      : prisma.project.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            deletedAt: null,
            status: 'ACTIVE'
          },
          orderBy: [{ workspaceId: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            environment: true,
            workspaceId: true
          }
        });

  const membersPromise = isCompanyAdmin
    ? Promise.all([
        prisma.companyMember.findMany({
          where: { companyId },
          orderBy: { user: { email: 'asc' } },
          select: {
            userId: true,
            role: true,
            createdAt: true,
            user: { select: { email: true, firstName: true, lastName: true } }
          }
        }),
        prisma.invite.findMany({
          where: {
            companyId,
            status: 'PENDING',
            scope: 'COMPANY'
          },
          orderBy: { emailNormalized: 'asc' },
          select: {
            id: true,
            email: true,
            companyRole: true,
            createdAt: true
          }
        })
      ])
    : Promise.resolve([[], []] as const);

  const [projectRows, membersBundle] = await Promise.all([projectsPromise, membersPromise]);

  const projects: Project[] = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    environment: mapProjectEnvironment(p.environment),
    workspaceId: p.workspaceId
  }));

  if (!isCompanyAdmin) {
    return { projects, members: [] };
  }

  const [companyMemberRows, pendingInvites] = membersBundle;

  const activeMembers: Member[] = companyMemberRows.map((row) => ({
    id: row.userId,
    email: row.user.email,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    role: row.role as Member['role'],
    status: 'ACTIVE',
    joinedAt: isoDateOnly(row.createdAt)
  }));

  const pendingMembers: Member[] = pendingInvites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    firstName: '',
    lastName: '',
    role: (inv.companyRole ?? 'MEMBER') as Member['role'],
    status: 'PENDING',
    joinedAt: isoDateOnly(inv.createdAt)
  }));

  return {
    projects,
    members: [...activeMembers, ...pendingMembers]
  };
}

// Company admin dashboard data
export async function getCompanyDashboardData(companyId: string) {
  const workspaces = await prisma.workspace.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      preferredRegion: true,
      _count: { select: { members: true } }
    }
  });

  const memberCount = await prisma.companyMember.count({
    where: { companyId }
  });

  const pendingInvites = await prisma.invite.count({
    where: { companyId, status: 'PENDING' }
  });

  return { workspaces, memberCount, pendingInvites };
}

// Workspace user dashboard data (default workspace alphabetically)
export async function getWorkspaceUserDashboardData(userId: string) {
  const workspaces = await getCachedWorkspacesForDashboardUser(userId);
  const defaultWorkspace = workspaces[0] ?? null;
  return { defaultWorkspace, workspaces };
}

function emptyDashboardSignals(): DashboardSignals {
  return { highlights: [], needsAttention: [] };
}

function defaultChartSources(): DashboardChartDataSource {
  return {
    categories: 'sample',
    actions: 'sample',
    regions: 'sample',
    workspaceSevenDay: 'none',
  };
}

async function fetchPreviousPeriodComparison(
  actor: { userId: string; userEmail: string; userRole: CompanyRole; companyId: string },
  workspaceApiId: string | undefined,
  rangeTotals: EventVolumeRangeTotal[]
): Promise<DashboardPeriodComparison | null> {
  const t24 = rangeTotals.find((r) => r.key === '24h');
  const t7 = rangeTotals.find((r) => r.key === '7d');
  if (!t24 || !t7) return null;
  const base = workspaceApiId ? { workspaceId: workspaceApiId } : {};
  const span24 = new Date(t24.to).getTime() - new Date(t24.from).getTime();
  const span7 = new Date(t7.to).getTime() - new Date(t7.from).getTime();
  const prev24From = new Date(new Date(t24.from).getTime() - span24).toISOString();
  const prev24To = t24.from;
  const prev7From = new Date(new Date(t7.from).getTime() - span7).toISOString();
  const prev7To = t7.from;
  try {
    const [p24, p7] = await Promise.all([
      getDashboardEvents(
        {
          limit: 1,
          offset: 0,
          sort: 'timestamp',
          order: 'desc',
          from: prev24From,
          to: prev24To,
          ...base,
        },
        actor
      ),
      getDashboardEvents(
        {
          limit: 1,
          offset: 0,
          sort: 'timestamp',
          order: 'desc',
          from: prev7From,
          to: prev7To,
          ...base,
        },
        actor
      ),
    ]);
    const current24h = t24.total;
    const current7d = t7.total;
    const pctChange24h = p24.total > 0 ? Math.round(((current24h - p24.total) / p24.total) * 100) : null;
    const pctChange7d = p7.total > 0 ? Math.round(((current7d - p7.total) / p7.total) * 100) : null;
    return {
      current24h,
      prev24h: p24.total,
      pctChange24h,
      current7d,
      prev7d: p7.total,
      pctChange7d,
    };
  } catch {
    return null;
  }
}

function buildRangeWindows(now: Date): Omit<EventVolumeRangeTotal, 'total'>[] {
  const to = now.toISOString();
  const hour = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return [
    { key: '1h', label: 'Past hour', from: hour, to },
    { key: '24h', label: 'Past 24 hours', from: day, to },
    { key: '7d', label: 'Past 7 days', from: week, to },
    { key: '30d', label: 'Past 30 days', from: month, to },
  ];
}

/**
 * Server-only HyreLog API metrics for the dashboard home. Bounded queries; billing only for optional insight cards.
 *
 * **HyreLog API call budget (happy path, API configured):**
 * - Not company-scoped and missing `workspaceApiId`: **0** HyreLog calls (early return).
 * - Otherwise:
 *   - **4** `getDashboardEvents` totals (one per rolling window: 1h/24h/7d/30d), parallel.
 *   - Histograms: native tries **up to 4** `getDashboardEventHistogram` (groupBy none) sequentially per window, or partitioned **many** `getDashboardEvents(limit:1)` sub-slices (batched by `CHUNK`).
 *   - **3** list samples: **1** recent (20) + **1** bounded sample (150) in parallel with histogram fetch; same window filters as totals.
 *   - Optional **2** `getDashboardEvents` for period comparison (prior 24h + prior 7d), parallel.
 *   - Native grouped 7d (only when histogram source is `native` and 7d window exists): **3–4** histograms current window + **3–4** previous window (parallel each batch); workspace group only when `companyScope && !workspaceApiId`.
 * - Workspace rows for histogram are **one** Prisma `findMany` (not HyreLog).
 */
export async function fetchDashboardHomeInsights(options: {
  companyId: string;
  userId: string;
  userEmail: string;
  companyRole: CompanyRole;
  /** Optional: used only for company-level billing pressure insights. */
  billingInfo?: BillingInfo | null;
  /**
   * HyreLog metrics scoped to this dashboard workspace (Prisma id).
   * Company admins: optional; members: must belong to workspace (otherwise first membership is used).
   */
  focusWorkspaceDashboardId?: string | null;
}): Promise<DashboardHomeInsights> {
  const { companyId, userId, userEmail, companyRole, billingInfo = null, focusWorkspaceDashboardId } = options;
  const actor = {
    userId,
    userEmail,
    userRole: companyRole,
    companyId
  };

  if (!isHyreLogApiConfigured()) {
    return {
      apiConfigured: false,
      loadError: null,
      rangeTotals: [],
      recentEvents: [],
      volumeHistograms: {},
      volumeHistogramsPartial: false,
      eventVolumeHistogramSource: 'partitioned',
      volumeChartNote: volumeChartDisclaimer({
        histogramsLoaded: false,
        histogramsPartial: false,
        histogramSource: 'partitioned',
      }),
      topActions: [],
      topCategories: [],
      topRegions: [],
      sampleSize: 0,
      sampleFrom: '',
      sampleTo: '',
      defaultWorkspaceDashboardId: null,
      chartDataSources: defaultChartSources(),
      nativeGrouped7d: null,
      nativeGroupedPrev7d: null,
      periodComparison: null,
      workspaceEvents7dByDashboardId: null,
      dashboardSignals: emptyDashboardSignals(),
    };
  }

  const companyScope = isCompanyLevelRole(companyRole);
  let workspaceApiId: string | undefined;
  let defaultWorkspaceDashboardId: string | null = null;

  if (companyScope && focusWorkspaceDashboardId) {
    const row = await prisma.workspace.findFirst({
      where: { id: focusWorkspaceDashboardId, companyId, deletedAt: null },
      select: { id: true, apiWorkspaceId: true }
    });
    if (row?.apiWorkspaceId) {
      workspaceApiId = row.apiWorkspaceId;
      defaultWorkspaceDashboardId = row.id;
    }
  }

  if (!companyScope) {
    const memberWorkspaces = await getCachedWorkspacesForDashboardUser(userId);
    const allowed = new Set(memberWorkspaces.map((w) => w.id));
    const pick =
      focusWorkspaceDashboardId && allowed.has(focusWorkspaceDashboardId)
        ? focusWorkspaceDashboardId
        : memberWorkspaces[0]?.id;
    if (pick) {
      defaultWorkspaceDashboardId = pick;
      const row = await prisma.workspace.findUnique({
        where: { id: pick },
        select: { apiWorkspaceId: true }
      });
      if (row?.apiWorkspaceId) workspaceApiId = row.apiWorkspaceId;
    }
  }

  if (!companyScope && !workspaceApiId) {
    return {
      apiConfigured: isHyreLogApiConfigured(),
      loadError: null,
      rangeTotals: [],
      recentEvents: [],
      volumeHistograms: {},
      volumeHistogramsPartial: false,
      eventVolumeHistogramSource: 'partitioned',
      volumeChartNote: volumeChartDisclaimer({
        histogramsLoaded: false,
        histogramsPartial: false,
        histogramSource: 'partitioned',
      }),
      topActions: [],
      topCategories: [],
      topRegions: [],
      sampleSize: 0,
      sampleFrom: '',
      sampleTo: '',
      defaultWorkspaceDashboardId,
      chartDataSources: defaultChartSources(),
      nativeGrouped7d: null,
      nativeGroupedPrev7d: null,
      periodComparison: null,
      workspaceEvents7dByDashboardId: null,
      dashboardSignals: emptyDashboardSignals(),
    };
  }

  const now = new Date();
  const windows = buildRangeWindows(now);
  const sampleFrom = windows.find((w) => w.key === '7d')?.from ?? windows[2].from;
  const sampleTo = windows[0].to;

  try {
    const rangePromises = windows.map(async (w) => {
      const data = await getDashboardEvents(
        {
          limit: 1,
          offset: 0,
          sort: 'timestamp',
          order: 'desc',
          from: w.from,
          to: w.to,
          ...(workspaceApiId ? { workspaceId: workspaceApiId } : {})
        },
        actor
      );
      return { ...w, total: data.total } satisfies EventVolumeRangeTotal;
    });

    const rangeTotals = await Promise.all(rangePromises);

    const [histogramFetch, recent, sample] = await Promise.all([
      rangeTotals.length > 0
        ? fetchEventVolumeHistograms({
            actor,
            workspaceApiId,
            windows: rangeTotals,
          })
        : Promise.resolve({
            histograms: {} as Partial<Record<EventVolumeRangeKey, EventVolumeRangeHistogram>>,
            source: 'partitioned' as const,
          }),
      getDashboardEvents(
        {
          limit: 20,
          offset: 0,
          sort: 'timestamp',
          order: 'desc',
          from: sampleFrom,
          to: sampleTo,
          ...(workspaceApiId ? { workspaceId: workspaceApiId } : {})
        },
        actor
      ),
      getDashboardEvents(
        {
          limit: 150,
          offset: 0,
          sort: 'timestamp',
          order: 'desc',
          from: sampleFrom,
          to: sampleTo,
          ...(workspaceApiId ? { workspaceId: workspaceApiId } : {})
        },
        actor
      )
    ]);

    const volumeHistograms = histogramFetch.histograms;
    const eventVolumeHistogramSource = histogramFetch.source;
    const volumeHistogramsPartial = Object.values(volumeHistograms).some((h) => h?.incomplete);
    const histogramsLoaded = (['1h', '24h', '7d', '30d'] as const).every((k) => volumeHistograms[k] != null);

    const recentEvents = recent.events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      category: e.category,
      action: e.action,
      actorEmail: e.actorEmail
    }));

    const topActionsSample = aggregateNamedCounts(sample.events, 'action', 12);
    const topCategoriesSample = aggregateNamedCounts(sample.events, 'category', 12);
    const topRegionsSample = aggregateGeoCounts(sample.events, 12);

    const workspaceRowsForHistogram = await prisma.workspace.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: { not: 'ARCHIVED' },
        ...(defaultWorkspaceDashboardId ? { id: defaultWorkspaceDashboardId } : {}),
      },
      select: { id: true, name: true, apiWorkspaceId: true },
    });

    const periodComparison = await fetchPreviousPeriodComparison(actor, workspaceApiId, rangeTotals);

    const w7 = rangeTotals.find((r) => r.key === '7d');
    let nativeGrouped7d: NativeGroupedWindowAnalytics | null = null;
    let nativeGroupedPrev7d: NativeGroupedWindowAnalytics | null = null;

    if (w7 && eventVolumeHistogramSource === 'native') {
      const spanMs = new Date(w7.to).getTime() - new Date(w7.from).getTime();
      const prevFrom = new Date(new Date(w7.from).getTime() - spanMs).toISOString();
      const prevTo = w7.from;
      const [ng7, ngPrev] = await Promise.all([
        fetchNativeGroupedWindowAnalytics({
          actor,
          workspaceApiId,
          from: w7.from,
          to: w7.to,
          companyScope,
          workspaceRows: workspaceRowsForHistogram,
        }),
        fetchNativeGroupedWindowAnalytics({
          actor,
          workspaceApiId,
          from: prevFrom,
          to: prevTo,
          companyScope,
          workspaceRows: workspaceRowsForHistogram,
        }),
      ]);
      nativeGrouped7d = ng7;
      nativeGroupedPrev7d = ngPrev;
    }

    let chartDataSources: DashboardChartDataSource = defaultChartSources();
    if (nativeGrouped7d) {
      chartDataSources = {
        categories: nativeGrouped7d.categories.length > 0 ? 'native_histogram_window' : 'sample',
        actions: nativeGrouped7d.actions.length > 0 ? 'native_histogram_window' : 'sample',
        regions: nativeGrouped7d.regions.length > 0 ? 'native_histogram_window' : 'sample',
        workspaceSevenDay:
          companyScope &&
          (nativeGrouped7d.workspaceBins?.some((b) => b.dashboardWorkspaceId && b.count > 0) ?? false)
            ? 'native_histogram_window'
            : 'none',
      };
    }

    const displayCategories = takeTopNamedWithOther(
      nativeGrouped7d?.categories?.length ? nativeGrouped7d.categories : topCategoriesSample,
      5
    );
    const displayActions = takeTopNamedWithOther(
      nativeGrouped7d?.actions?.length ? nativeGrouped7d.actions : topActionsSample,
      5
    );
    const displayRegions = takeTopNamedWithOther(
      nativeGrouped7d?.regions?.length ? nativeGrouped7d.regions : topRegionsSample,
      5
    );

    let workspaceEvents7dByDashboardId: Record<string, number> | null = null;
    if (nativeGrouped7d?.workspaceBins?.length) {
      const o: Record<string, number> = {};
      for (const b of nativeGrouped7d.workspaceBins) {
        if (b.dashboardWorkspaceId) o[b.dashboardWorkspaceId] = b.count;
      }
      workspaceEvents7dByDashboardId = o;
    }

    const sevenDayExplorerRange = w7 ? { from: w7.from, to: w7.to } : { from: sampleFrom, to: sampleTo };

    const dashboardSignals = deriveDashboardSignals({
      companyScope,
      defaultWorkspaceDashboardId,
      rangeTotals,
      volumeHistogramsPartial,
      eventVolumeHistogramSource,
      nativeGrouped7d,
      nativeGroupedPrev7d,
      periodComparison,
      workspaceBins7d: nativeGrouped7d?.workspaceBins ?? null,
      visibleWorkspaceDashboardIds: workspaceRowsForHistogram.map((w) => w.id),
      billingInfo: companyScope ? billingInfo : undefined,
      sevenDayExplorerRange,
      loadError: null,
      apiConfigured: true,
    });

    return {
      apiConfigured: true,
      loadError: null,
      rangeTotals,
      recentEvents,
      volumeHistograms,
      volumeHistogramsPartial,
      eventVolumeHistogramSource,
      volumeChartNote: volumeChartDisclaimer({
        histogramsLoaded,
        histogramsPartial: volumeHistogramsPartial,
        histogramSource: eventVolumeHistogramSource,
      }),
      topActions: displayActions,
      topCategories: displayCategories,
      topRegions: displayRegions,
      sampleSize: sample.events.length,
      sampleFrom,
      sampleTo,
      defaultWorkspaceDashboardId,
      chartDataSources,
      nativeGrouped7d,
      nativeGroupedPrev7d,
      periodComparison,
      workspaceEvents7dByDashboardId,
      dashboardSignals,
    };
  } catch (e) {
    dashboardLog.error('dashboard_insights_load_failed', {
      outcome: 'exception',
      companyScope: isCompanyLevelRole(companyRole),
    });
    return {
      apiConfigured: true,
      loadError: 'Could not load live metrics from HyreLog.',
      rangeTotals: [],
      recentEvents: [],
      volumeHistograms: {},
      volumeHistogramsPartial: false,
      eventVolumeHistogramSource: 'partitioned',
      volumeChartNote: volumeChartDisclaimer({
        histogramsLoaded: false,
        histogramsPartial: false,
        histogramSource: 'partitioned',
      }),
      topActions: [],
      topCategories: [],
      topRegions: [],
      sampleSize: 0,
      sampleFrom,
      sampleTo,
      defaultWorkspaceDashboardId,
      chartDataSources: defaultChartSources(),
      nativeGrouped7d: null,
      nativeGroupedPrev7d: null,
      periodComparison: null,
      workspaceEvents7dByDashboardId: null,
      dashboardSignals: emptyDashboardSignals(),
    };
  }
}

export { fetchEventVolumeHistograms as fetchDashboardEventVolumeHistograms } from '@/lib/dashboard/fetch-event-volume-histograms';
export type { EventVolumeHistogramFetchResult } from '@/lib/dashboard/fetch-event-volume-histograms';
export { buildHistogramSubWindows } from '@/lib/dashboard/event-volume-histogram';
