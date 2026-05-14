import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { NamedCount } from '@/lib/dashboard/types';
import type { ExplorerTimeRange } from '@/lib/dashboard/drilldown';
import { buildCategoryDrilldownUrl, buildEventExplorerUrl, buildWorkspaceEventsUrl } from '@/lib/dashboard/drilldown';
import { formatCompactNumber } from '@/lib/dashboard/formatters';

function maxCount(rows: NamedCount[]): number {
  return Math.max(1, ...rows.map((r) => r.count));
}

interface EventCategoriesChartProps {
  rows: NamedCount[];
  footnote?: string;
  drillRange?: ExplorerTimeRange;
  workspaceDashboardId?: string | null;
  /** Whether counts come from HyreLog native histogram vs bounded list sample. */
  distributionSource?: 'native_histogram_window' | 'sample';
}

export function EventCategoriesChart({
  rows,
  footnote,
  drillRange,
  workspaceDashboardId,
  distributionSource = 'sample',
}: EventCategoriesChartProps) {
  const m = maxCount(rows);
  const fallbackExplorer = workspaceDashboardId
    ? buildWorkspaceEventsUrl(workspaceDashboardId)
    : buildEventExplorerUrl({});
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader>
        <CardTitle className="text-lg">Top categories</CardTitle>
        <CardDescription>
          {distributionSource === 'native_histogram_window'
            ? 'Counts from HyreLog SQL aggregation across the rolling 7-day window.'
            : 'Counts from the same bounded sample as actions.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough sampled events to rank categories.</p>
        ) : (
          rows.map((r) => {
            const href = drillRange
              ? buildCategoryDrilldownUrl(r.name, drillRange, workspaceDashboardId)
              : fallbackExplorer;
            return (
              <Link
                key={r.name}
                href={href}
                className="block cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/40 py-1 -mx-1 px-1"
                aria-label={`Open Event Explorer filtered to category ${r.name}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-foreground">{r.name}</span>
                    <span className="tabular-nums text-muted-foreground">{formatCompactNumber(r.count)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full bg-linear-to-r from-slate-700 to-slate-500 dark:from-slate-400 dark:to-slate-200"
                      style={{ width: `${Math.round((r.count / m) * 100)}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })
        )}
        {footnote ? <p className="text-xs text-muted-foreground">{footnote}</p> : null}
      </CardContent>
    </Card>
  );
}
