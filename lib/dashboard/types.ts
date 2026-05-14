import type { CompanyRole } from '@/types/dashboard';

/** Roles that see company-wide dashboard, all workspaces, and billing surfaces. */
export function isCompanyLevelRole(role: CompanyRole): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'BILLING';
}

/** Workspace-scoped dashboard: company MEMBER with explicit workspace membership. */
export function isWorkspaceOnlyRole(role: CompanyRole): boolean {
  return role === 'MEMBER';
}

export type EventVolumeRangeKey = '1h' | '24h' | '7d' | '30d';

export type EventVolumeRangeTotal = {
  key: EventVolumeRangeKey;
  label: string;
  from: string;
  to: string;
  total: number;
};

/** One sub-interval inside a rolling range (counts from HyreLog `total` for that slice). */
export type EventVolumeHistogramBucket = {
  from: string;
  to: string;
  label: string;
  count: number;
};

export type EventVolumeRangeHistogram = {
  buckets: EventVolumeHistogramBucket[];
  bucketSum: number;
  /** HyreLog total for the full parent window (same filter as range totals). */
  windowTotal: number;
  /** True when a sub-query failed or bucket sums diverge from the window total. */
  incomplete: boolean;
  /** `native`: single SQL histogram per window; `partitioned`: many `getDashboardEvents` totals. */
  aggregation?: 'native' | 'partitioned';
};

export type NamedCount = { name: string; count: number };

export type WorkspaceHistogramBin = {
  dashboardWorkspaceId: string;
  name: string;
  count: number;
};

/** Full-window grouped totals from HyreLog native histogram (merged buckets). */
export type NativeGroupedWindowAnalytics = {
  from: string;
  to: string;
  interval: 'hour' | 'day';
  categories: NamedCount[];
  actions: NamedCount[];
  regions: NamedCount[];
  workspaceBins: WorkspaceHistogramBin[] | null;
  partial: boolean;
};

export type DashboardInsightSeverity = 'info' | 'positive' | 'warning';

export type DashboardInsightItem = {
  id: string;
  title: string;
  description: string;
  severity: DashboardInsightSeverity;
  href?: string;
  ariaLabel?: string;
};

export type DashboardSignals = {
  highlights: DashboardInsightItem[];
  needsAttention: DashboardInsightItem[];
};

export type DashboardPeriodComparison = {
  current24h: number;
  prev24h: number;
  pctChange24h: number | null;
  current7d: number;
  prev7d: number;
  pctChange7d: number | null;
};

export type DashboardChartDataSource = {
  categories: 'native_histogram_window' | 'sample';
  actions: 'native_histogram_window' | 'sample';
  regions: 'native_histogram_window' | 'sample';
  workspaceSevenDay: 'native_histogram_window' | 'none';
};

export type DashboardEventRow = {
  id: string;
  timestamp: string;
  category: string;
  action: string;
  actorEmail?: string | null;
  workspaceLabel?: string;
};

export type DashboardHomeInsights = {
  apiConfigured: boolean;
  loadError: string | null;
  /** Totals per window (from HyreLog API `total` for matching filters). */
  rangeTotals: EventVolumeRangeTotal[];
  /** Recent events for activity feed (bounded). */
  recentEvents: DashboardEventRow[];
  /**
   * Intra-window counts from partitioned `from`/`to` HyreLog queries (not sampled rows).
   * Omitted keys mean histograms were not loaded (e.g. API error mid-flight).
   */
  volumeHistograms: Partial<Record<EventVolumeRangeKey, EventVolumeRangeHistogram>>;
  /** True when any loaded histogram flagged incomplete or drift vs window totals. */
  volumeHistogramsPartial: boolean;
  /** Whether intra-window bars came from native SQL or legacy partitioned totals. */
  eventVolumeHistogramSource: 'native' | 'partitioned';
  /** Human-readable chart footnote (honest about methodology). */
  volumeChartNote: string;
  /** Aggregates from a bounded sample of recent events (see sampleSize). */
  topActions: NamedCount[];
  topCategories: NamedCount[];
  /** From `geo` on sampled events; not a complete distribution (see sample footnotes). */
  topRegions: NamedCount[];
  sampleSize: number;
  sampleFrom: string;
  sampleTo: string;
  /** Dashboard workspace id (Prisma) for Event Explorer query param. */
  defaultWorkspaceDashboardId: string | null;
  /** Whether charts use native SQL histogram windows or bounded list samples. */
  chartDataSources: DashboardChartDataSource;
  /** Native grouped totals for the rolling 7d window (null when unavailable). */
  nativeGrouped7d: NativeGroupedWindowAnalytics | null;
  /** Previous rolling 7d window (for comparisons). */
  nativeGroupedPrev7d: NativeGroupedWindowAnalytics | null;
  /** Current vs previous 24h / 7d headline totals from HyreLog. */
  periodComparison: DashboardPeriodComparison | null;
  /** 7d event totals per dashboard workspace id (company scope; from native histogram). */
  workspaceEvents7dByDashboardId: Record<string, number> | null;
  /** Insight + attention cards (server-derived). */
  dashboardSignals: DashboardSignals;
};
