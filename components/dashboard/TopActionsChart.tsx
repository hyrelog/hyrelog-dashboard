import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { NamedCount } from '@/lib/dashboard/types';
import type { ExplorerTimeRange } from '@/lib/dashboard/drilldown';
import { buildActionDrilldownUrl, buildEventExplorerUrl, buildWorkspaceEventsUrl } from '@/lib/dashboard/drilldown';
import { formatCompactNumber } from '@/lib/dashboard/formatters';

interface HorizontalBarChartProps {
  title: string;
  description: string;
  rows: NamedCount[];
  footnote?: string;
  emptyLabel?: string;
  drillRange?: ExplorerTimeRange;
  workspaceDashboardId?: string | null;
  distributionSource?: 'native_histogram_window' | 'sample';
}

function maxCount(rows: NamedCount[]): number {
  return Math.max(1, ...rows.map((r) => r.count));
}

export function TopActionsChart({
  title,
  description,
  rows,
  footnote,
  emptyLabel = 'Not enough sampled events to rank actions.',
  drillRange,
  workspaceDashboardId,
  distributionSource = 'sample',
}: HorizontalBarChartProps) {
  const m = maxCount(rows);
  const fallbackExplorer = workspaceDashboardId
    ? buildWorkspaceEventsUrl(workspaceDashboardId)
    : buildEventExplorerUrl({});
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          {distributionSource === 'native_histogram_window'
            ? 'Counts from HyreLog SQL aggregation across the rolling 7-day window (not billing usage).'
            : description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          rows.map((r) => {
            const href = drillRange
              ? buildActionDrilldownUrl(r.name, drillRange, workspaceDashboardId)
              : fallbackExplorer;
            return (
              <Link
                key={r.name}
                href={href}
                className="block cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/40 py-1 -mx-1 px-1"
                aria-label={`Open Event Explorer filtered to action ${r.name}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-foreground">{r.name}</span>
                    <span className="tabular-nums text-muted-foreground">{formatCompactNumber(r.count)}</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="presentation"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-linear-to-r from-brand-700 to-brand-500 dark:from-brand-500 dark:to-brand-300"
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
