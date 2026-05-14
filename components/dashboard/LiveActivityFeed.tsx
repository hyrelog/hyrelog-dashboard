import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { DashboardEventRow } from '@/lib/dashboard/types';
import type { ExplorerTimeRange } from '@/lib/dashboard/drilldown';
import { buildExplorerUrlForFeedRow, buildEventExplorerUrl, buildWorkspaceEventsUrl } from '@/lib/dashboard/drilldown';
import { formatEventTimestamp, formatRelativeFromNow } from '@/lib/dashboard/formatters';

interface LiveActivityFeedProps {
  events: DashboardEventRow[];
  title?: string;
  emptyMessage?: string;
  /** When set with a non-empty sample window, rows link into Explorer with best-effort filters. */
  drillSampleRange?: ExplorerTimeRange;
  workspaceDashboardId?: string | null;
}

export function LiveActivityFeed({
  events,
  title = 'Live activity',
  emptyMessage = 'Not enough events in this window yet. Ingest audit events from your apps to populate this feed.',
  drillSampleRange,
  workspaceDashboardId,
}: LiveActivityFeedProps) {
  const sampleRange = drillSampleRange;
  const canDrill = Boolean(
    sampleRange?.from &&
      sampleRange?.to &&
      !Number.isNaN(new Date(sampleRange.from).getTime()) &&
      !Number.isNaN(new Date(sampleRange.to).getTime())
  );

  const emptyExplorerHref = workspaceDashboardId
    ? buildWorkspaceEventsUrl(workspaceDashboardId, canDrill && sampleRange ? sampleRange : {})
    : buildEventExplorerUrl(canDrill && sampleRange ? sampleRange : {});
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Latest audit events (immutable log).</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            <Link
              href={emptyExplorerHref}
              className="inline-flex text-sm font-medium text-brand-600 underline-offset-4 hover:underline dark:text-brand-400 cursor-pointer"
              aria-label="Open Event Explorer"
            >
              Open Event Explorer
            </Link>
          </div>
        ) : (
          <ul className="space-y-0">
            {events.map((e, idx) => {
              const rowHref =
                canDrill && sampleRange
                  ? buildExplorerUrlForFeedRow(e, {
                      ...sampleRange,
                      workspaceDashboardId: workspaceDashboardId ?? undefined,
                    })
                  : workspaceDashboardId
                    ? buildWorkspaceEventsUrl(workspaceDashboardId)
                    : buildEventExplorerUrl({});
              return (
                <li key={e.id}>
                  {idx > 0 ? <Separator className="my-3" /> : null}
                  <Link
                    href={rowHref}
                    className="group block cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50 -mx-2 px-2 py-1"
                    aria-label={`Open Event Explorer for ${e.category} ${e.action}`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground group-hover:text-brand-700 dark:group-hover:text-brand-300">
                          <span className="text-muted-foreground">{e.category}</span>
                          <span className="mx-1 text-muted-foreground">·</span>
                          {e.action}
                        </p>
                        <time className="text-xs text-muted-foreground" dateTime={e.timestamp}>
                          {formatEventTimestamp(e.timestamp)}
                          <span className="sr-only"> ({formatRelativeFromNow(e.timestamp)})</span>
                        </time>
                      </div>
                      {e.actorEmail ? (
                        <p className="text-xs text-muted-foreground">{e.actorEmail}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
