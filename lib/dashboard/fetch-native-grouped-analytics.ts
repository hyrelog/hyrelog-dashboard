import { getDashboardEventHistogram } from '@/lib/hyrelog-api';
import type { ActorHeaders } from '@/lib/hyrelog-api/client';
import { dashboardLog } from '@/lib/dashboard-logger';
import { mergeHistogramGroupTotals, mapMergedToNamedCounts } from '@/lib/dashboard/histogram-merge';
import { isNativeHistogramExplicitlyDisabled } from '@/lib/dashboard/fetch-event-volume-histograms';
import type { NamedCount, NativeGroupedWindowAnalytics, WorkspaceHistogramBin } from '@/lib/dashboard/types';

type Actor = ActorHeaders & { companyId: string };

function intervalForSpanMs(spanMs: number): 'hour' | 'day' {
  return spanMs > 36 * 60 * 60 * 1000 ? 'day' : 'hour';
}

type WorkspaceRow = { id: string; name: string; apiWorkspaceId: string | null };

/**
 * Fetches grouped HyreLog histograms for a single [from, to] window.
 * Workspace histogram is company-wide only (no workspaceId filter).
 */
export async function fetchNativeGroupedWindowAnalytics(options: {
  actor: Actor;
  workspaceApiId?: string;
  from: string;
  to: string;
  companyScope: boolean;
  /** Required for resolving workspace UUID keys from histogram → dashboard workspace ids. */
  workspaceRows?: WorkspaceRow[] | null;
}): Promise<NativeGroupedWindowAnalytics | null> {
  if (isNativeHistogramExplicitlyDisabled()) return null;

  const { actor, workspaceApiId, from, to, companyScope, workspaceRows } = options;
  const span = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(span) || span <= 0) return null;

  const interval = intervalForSpanMs(span);
  const base = {
    from,
    to,
    interval,
    ...(workspaceApiId ? { workspaceId: workspaceApiId } : {}),
  } as const;

  const apiIdToDashboard = new Map<string, { id: string; name: string }>();
  if (workspaceRows?.length) {
    for (const w of workspaceRows) {
      if (w.apiWorkspaceId) apiIdToDashboard.set(w.apiWorkspaceId, { id: w.id, name: w.name });
    }
  }

  try {
    const [cat, act, reg] = await Promise.all([
      getDashboardEventHistogram({ ...base, groupBy: 'category' }, actor),
      getDashboardEventHistogram({ ...base, groupBy: 'action' }, actor),
      getDashboardEventHistogram({ ...base, groupBy: 'region' }, actor),
    ]);

    let wsHist: Awaited<ReturnType<typeof getDashboardEventHistogram>> | null = null;
    if (companyScope && !workspaceApiId) {
      wsHist = await getDashboardEventHistogram({ ...base, groupBy: 'workspace' }, actor);
    }

    const partial =
      cat.meta.partial || act.meta.partial || reg.meta.partial || (wsHist?.meta.partial ?? false);

    const categories: NamedCount[] = mapMergedToNamedCounts(mergeHistogramGroupTotals(cat));
    const actions: NamedCount[] = mapMergedToNamedCounts(mergeHistogramGroupTotals(act));
    const regions: NamedCount[] = mapMergedToNamedCounts(mergeHistogramGroupTotals(reg));

    let workspaceBins: WorkspaceHistogramBin[] | null = null;
    if (wsHist) {
      const merged = mergeHistogramGroupTotals(wsHist);
      const bins: WorkspaceHistogramBin[] = [];
      for (const [apiKey, count] of merged) {
        if (apiKey === '__total__') continue;
        const hit = apiIdToDashboard.get(apiKey);
        if (hit) {
          bins.push({ dashboardWorkspaceId: hit.id, name: hit.name, count });
        } else {
          bins.push({
            dashboardWorkspaceId: '',
            name: `Workspace ${apiKey.slice(0, 8)}…`,
            count,
          });
        }
      }
      bins.sort((a, b) => b.count - a.count);
      workspaceBins = bins;
    }

    return {
      from,
      to,
      interval,
      categories,
      actions,
      regions,
      workspaceBins,
      partial,
    };
  } catch {
    dashboardLog.warn('dashboard_grouped_analytics_fallback', { reason: 'histogram_grouped_fetch_error' });
    return null;
  }
}
