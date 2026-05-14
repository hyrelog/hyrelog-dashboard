import type {
  NamedCount,
  EventVolumeRangeTotal,
  NativeGroupedWindowAnalytics,
  WorkspaceHistogramBin,
  DashboardPeriodComparison,
  DashboardInsightItem,
} from '@/lib/dashboard/types';
import type { BillingInfo } from '@/types/dashboard';
import {
  buildCategoryDrilldownUrl,
  buildEventExplorerUrl,
  buildWorkspaceEventsUrl,
  type ExplorerTimeRange,
} from '@/lib/dashboard/drilldown';

export type DeriveDashboardSignalsInput = {
  companyScope: boolean;
  defaultWorkspaceDashboardId: string | null;
  rangeTotals: EventVolumeRangeTotal[];
  volumeHistogramsPartial: boolean;
  eventVolumeHistogramSource: 'native' | 'partitioned';
  nativeGrouped7d: NativeGroupedWindowAnalytics | null;
  nativeGroupedPrev7d: NativeGroupedWindowAnalytics | null;
  periodComparison: DashboardPeriodComparison | null;
  workspaceBins7d: WorkspaceHistogramBin[] | null;
  visibleWorkspaceDashboardIds: string[];
  billingInfo?: BillingInfo | null;
  sevenDayExplorerRange: ExplorerTimeRange;
  loadError: string | null;
  apiConfigured: boolean;
};

const SECURITY_CATEGORY_FRAGMENTS = [
  'auth',
  'security',
  'access',
  'permission',
  'login',
  'mfa',
  'audit',
  'credential',
  'token',
];

function isSecurityishCategory(name: string): boolean {
  const n = name.toLowerCase();
  return SECURITY_CATEGORY_FRAGMENTS.some((f) => n.includes(f));
}

function largestCategoryIncrease(
  current: NamedCount[] | undefined,
  previous: NamedCount[] | undefined
): { name: string; current: number; previous: number; pct: number } | null {
  if (!current?.length || !previous?.length) return null;
  const prevMap = new Map(previous.map((p) => [p.name, p.count]));
  let best: { name: string; current: number; previous: number; pct: number } | null = null;
  for (const row of current) {
    const p = prevMap.get(row.name) ?? 0;
    if (p < 5) continue;
    if (row.count <= p * 1.25) continue;
    const pct = Math.round(((row.count - p) / p) * 100);
    if (!best || pct > best.pct) best = { name: row.name, current: row.count, previous: p, pct };
  }
  return best;
}

function securityCategoryVolume(rows: NamedCount[]): number {
  return rows.filter((r) => isSecurityishCategory(r.name)).reduce((s, r) => s + r.count, 0);
}

function workspaceConcentration(
  bins: WorkspaceHistogramBin[] | null,
  total7d: number
): { name: string; pct: number; id: string } | null {
  if (!bins?.length || total7d <= 0) return null;
  const top = bins[0];
  if (!top.dashboardWorkspaceId) return null;
  const pct = Math.round((top.count / total7d) * 100);
  if (pct < 55) return null;
  return { name: top.name, pct, id: top.dashboardWorkspaceId };
}

function spikeWorkspace(
  current: WorkspaceHistogramBin[] | null,
  previous: WorkspaceHistogramBin[] | null
): WorkspaceHistogramBin | null {
  if (!current?.length || !previous?.length) return null;
  const prevMap = new Map(previous.filter((b) => b.dashboardWorkspaceId).map((b) => [b.dashboardWorkspaceId, b.count]));
  let best: WorkspaceHistogramBin | null = null;
  let bestRatio = 0;
  for (const c of current) {
    if (!c.dashboardWorkspaceId) continue;
    const p = prevMap.get(c.dashboardWorkspaceId) ?? 0;
    if (p < 10 || c.count < 20) continue;
    const ratio = c.count / p;
    if (ratio >= 2 && ratio > bestRatio) {
      bestRatio = ratio;
      best = c;
    }
  }
  return best;
}

function billingEventsPressure(billing: BillingInfo | null | undefined): { pct: number } | null {
  const lim = billing?.limits?.eventsIngested;
  const use = billing?.usage?.eventsIngested;
  if (lim == null || lim <= 0 || use == null) return null;
  const pct = Math.round((use / lim) * 100);
  if (pct < 80) return null;
  return { pct };
}

/**
 * Derives short-lived insight + “needs attention” cards from real dashboard payloads only.
 */
export function deriveDashboardSignals(input: DeriveDashboardSignalsInput): {
  highlights: DashboardInsightItem[];
  needsAttention: DashboardInsightItem[];
} {
  const highlights: DashboardInsightItem[] = [];
  const needsAttention: DashboardInsightItem[] = [];

  const t24 = input.rangeTotals.find((r) => r.key === '24h');
  const t7 = input.rangeTotals.find((r) => r.key === '7d');
  const wsScoped = input.defaultWorkspaceDashboardId;

  const explorerScoped = (filters: { from?: string; to?: string; category?: string; action?: string }) =>
    wsScoped ? buildWorkspaceEventsUrl(wsScoped, filters) : buildEventExplorerUrl(filters);

  if (!input.apiConfigured) {
    needsAttention.push({
      id: 'api-off',
      title: 'HyreLog API not configured',
      description: 'Live metrics need HYRELOG_API_URL and DASHBOARD_SERVICE_TOKEN in this deployment.',
      severity: 'warning',
    });
    return { highlights, needsAttention };
  }

  if (input.loadError) {
    needsAttention.push({
      id: 'load-error',
      title: 'Could not load live metrics',
      description:
        'HyreLog did not return usable metrics for this view. Refresh the page or try again shortly.',
      severity: 'warning',
      href: wsScoped ? buildWorkspaceEventsUrl(wsScoped) : buildEventExplorerUrl({}),
      ariaLabel: 'Open Event Explorer',
    });
    return { highlights, needsAttention };
  }

  if (t24 && t24.total === 0) {
    needsAttention.push({
      id: 'no-24h',
      title: 'No events in the last 24 hours',
      description: 'Confirm ingestion is still running and API keys are unchanged.',
      severity: 'warning',
      href: explorerScoped({ from: t24.from, to: t24.to }),
      ariaLabel: 'Open Event Explorer for the past 24 hours',
    });
  }

  if (t7 && t7.total === 0 && (!t24 || t24.total > 0)) {
    needsAttention.push({
      id: 'no-7d',
      title: 'No events in the last 7 days',
      description: 'Longer windows are empty—double-check workspace selection and retention.',
      severity: 'warning',
      href: explorerScoped({ from: t7.from, to: t7.to }),
      ariaLabel: 'Open Event Explorer for the past 7 days',
    });
  }

  if (input.volumeHistogramsPartial) {
    needsAttention.push({
      id: 'partial-histogram',
      title: 'Histogram is partial or truncated',
      description:
        input.eventVolumeHistogramSource === 'native'
          ? 'HyreLog capped grouped rows or bucket sums diverged from headline totals. Try a shorter window or coarser interval.'
          : 'Partitioned bucket totals did not fully reconcile with headline totals.',
      severity: 'warning',
      href: explorerScoped({ from: input.sevenDayExplorerRange.from, to: input.sevenDayExplorerRange.to }),
      ariaLabel: 'Review events in the 7-day window',
    });
  }

  if (input.periodComparison) {
    const { pctChange24h, pctChange7d, current24h, prev24h, current7d, prev7d } = input.periodComparison;
    if (pctChange24h != null && pctChange24h >= 15 && current24h >= 10) {
      highlights.push({
        id: 'up-24h',
        title: 'Activity is up vs prior 24 hours',
        description: `Roughly ${pctChange24h}% more events than the previous 24-hour window (${current24h.toLocaleString()} vs ${prev24h.toLocaleString()}).`,
        severity: 'positive',
        href: explorerScoped({ from: t24!.from, to: t24!.to }),
        ariaLabel: 'Open Event Explorer for the current 24 hour window',
      });
    }
    if (pctChange24h != null && pctChange24h <= -30 && prev24h >= 20) {
      needsAttention.push({
        id: 'down-24h',
        title: 'Activity dropped vs prior 24 hours',
        description: `About ${Math.abs(pctChange24h)}% fewer events than the previous 24-hour window.`,
        severity: 'warning',
        href: explorerScoped({ from: t24!.from, to: t24!.to }),
        ariaLabel: 'Open Event Explorer for the current 24 hour window',
      });
    }
    if (pctChange7d != null && pctChange7d >= 15 && current7d >= 50) {
      highlights.push({
        id: 'up-7d',
        title: 'This 7 days beat the prior 7 days',
        description: `Roughly ${pctChange7d}% more events week over week (${current7d.toLocaleString()} vs ${prev7d.toLocaleString()}).`,
        severity: 'info',
        href: explorerScoped({ from: t7!.from, to: t7!.to }),
        ariaLabel: 'Open Event Explorer for the past 7 days',
      });
    }
  }

  const catIncrease = largestCategoryIncrease(
    input.nativeGrouped7d?.categories,
    input.nativeGroupedPrev7d?.categories
  );
  if (catIncrease && input.nativeGrouped7d) {
    highlights.push({
      id: 'cat-up',
      title: `${catIncrease.name} events increased vs prior week`,
      description: `${catIncrease.current.toLocaleString()} in the last 7 days vs ${catIncrease.previous.toLocaleString()} in the previous 7 days (~${catIncrease.pct}% higher).`,
      severity: 'info',
      href: buildCategoryDrilldownUrl(catIncrease.name, input.sevenDayExplorerRange, wsScoped),
      ariaLabel: `Open Event Explorer filtered to category ${catIncrease.name}`,
    });
  }

  const secVol =
    input.nativeGrouped7d?.categories?.length ? securityCategoryVolume(input.nativeGrouped7d.categories) : 0;
  if (secVol >= 20 && t7 && t7.total > 0) {
    const href = explorerScoped({ from: input.sevenDayExplorerRange.from, to: input.sevenDayExplorerRange.to });
    needsAttention.push({
      id: 'security-volume',
      title: 'Security-related categories are prominent',
      description: `About ${secVol.toLocaleString()} events in the last 7 days matched security/auth-style categories in the HyreLog histogram.`,
      severity: 'info',
      href,
      ariaLabel: 'Review recent events',
    });
  }

  if (input.companyScope && input.workspaceBins7d && t7 && t7.total > 0) {
    const conc = workspaceConcentration(input.workspaceBins7d, t7.total);
    if (conc) {
      highlights.push({
        id: 'workspace-skew',
        title: `${conc.name} drives most recent activity`,
        description: `About ${conc.pct}% of the company’s last-7-day events landed in that workspace (HyreLog histogram).`,
        severity: 'info',
        href: buildWorkspaceEventsUrl(conc.id, { from: t7.from, to: t7.to }),
        ariaLabel: `Open Event Explorer for workspace ${conc.name}`,
      });
    }

    const prevBins = input.nativeGroupedPrev7d?.workspaceBins ?? null;
    const spike = spikeWorkspace(input.workspaceBins7d, prevBins);
    if (spike?.dashboardWorkspaceId) {
      needsAttention.push({
        id: 'workspace-spike',
        title: `${spike.name} has a sharp week-over-week increase`,
        description:
          'Compared to the previous 7 days, this workspace’s event volume at least doubled while passing minimum volume thresholds.',
        severity: 'warning',
        href: buildWorkspaceEventsUrl(spike.dashboardWorkspaceId, { from: t7.from, to: t7.to }),
        ariaLabel: `Inspect events for ${spike.name}`,
      });
    }

    const quiet = input.visibleWorkspaceDashboardIds.filter((id) => {
      const hit = input.workspaceBins7d!.find((b) => b.dashboardWorkspaceId === id);
      return !hit || hit.count === 0;
    });
    if (quiet.length > 0 && quiet.length <= 5 && input.workspaceBins7d.some((b) => b.count > 0)) {
      needsAttention.push({
        id: 'quiet-workspaces',
        title: `${quiet.length} workspace(s) had no events in the last 7 days`,
        description: 'HyreLog histogram totals were zero for those workspaces while others recorded traffic.',
        severity: 'info',
        href: buildEventExplorerUrl({ from: t7.from, to: t7.to }),
        ariaLabel: 'Open company Event Explorer for the past 7 days',
      });
    }
  }

  const billingPressure = input.companyScope ? billingEventsPressure(input.billingInfo) : null;
  if (billingPressure) {
    needsAttention.push({
      id: 'billing-pressure',
      title: 'Event usage is nearing the plan limit',
      description: `Roughly ${billingPressure.pct}% of the subscribed monthly event allowance is used for this billing period (dashboard usage summary).`,
      severity: 'warning',
      href: '/billing/subscription',
      ariaLabel: 'Open billing subscription',
    });
  }

  if (!input.nativeGrouped7d && !input.periodComparison && highlights.length === 0 && needsAttention.length === 0) {
    highlights.push({
      id: 'not-enough-history',
      title: 'Not enough history yet',
      description:
        input.eventVolumeHistogramSource === 'partitioned'
          ? 'Native histograms were unavailable; comparisons and grouped breakdowns may stay limited until HyreLog serves the metrics endpoint.'
          : 'Once HyreLog records more volume, week-over-week comparisons and category insights will appear here.',
      severity: 'info',
      href: '/events',
      ariaLabel: 'Open Event Explorer',
    });
  }

  return { highlights, needsAttention };
}
