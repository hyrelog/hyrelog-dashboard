import Link from 'next/link';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Workspace } from '@/types/dashboard';
import { buildWorkspaceEventsUrl, type ExplorerTimeRange } from '@/lib/dashboard/drilldown';
import { cn } from '@/lib/utils';

function intensityClass(events: number | null | undefined): string {
  if (events == null) return 'bg-muted/50';
  if (events <= 0) return 'bg-muted/40';
  if (events < 500) return 'bg-emerald-500/25 dark:bg-emerald-400/20';
  if (events < 5000) return 'bg-emerald-500/45 dark:bg-emerald-400/35';
  if (events < 50000) return 'bg-amber-500/45 dark:bg-amber-400/35';
  return 'bg-rose-500/45 dark:bg-rose-400/35';
}

interface WorkspaceHeatmapProps {
  workspaces: Workspace[];
  /** Optional 7d HyreLog totals keyed by dashboard workspace id (native histogram). */
  events7dByWorkspaceId?: Record<string, number> | null;
  /** Optional sample window to align Explorer deep-links with dashboard charts. */
  drillRange?: ExplorerTimeRange;
}

export function WorkspaceHeatmap({ workspaces, events7dByWorkspaceId, drillRange }: WorkspaceHeatmapProps) {
  const sorted = useMemo(() => {
    if (!events7dByWorkspaceId) return workspaces;
    return [...workspaces].sort((a, b) => {
      const da = events7dByWorkspaceId[a.id] ?? -1;
      const db = events7dByWorkspaceId[b.id] ?? -1;
      if (db !== da) return db - da;
      return a.name.localeCompare(b.name);
    });
  }, [workspaces, events7dByWorkspaceId]);

  const hasSeven = Boolean(events7dByWorkspaceId && Object.keys(events7dByWorkspaceId).length > 0);
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader>
        <CardTitle className="text-lg">Workspace heatmap</CardTitle>
        <CardDescription>
          {hasSeven
            ? 'Tiles ordered by HyreLog 7-day event totals (native histogram). MTD shown as secondary context.'
            : 'Relative month-to-date event totals per workspace (from HyreLog). Unknown cells mean usage was not loaded.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {workspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workspaces to display.</p>
        ) : (
          <div
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
            aria-label="Workspaces by relative event volume"
          >
            {sorted.map((w) => (
              <Link
                key={w.id}
                href={
                  drillRange?.from && drillRange?.to
                    ? buildWorkspaceEventsUrl(w.id, drillRange)
                    : buildWorkspaceEventsUrl(w.id)
                }
                role="listitem"
                className={cn(
                  'block cursor-pointer rounded-xl border border-border/60 p-3 shadow-inner outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring hover:shadow-md',
                  intensityClass(w.monthlyEvents ?? null)
                )}
                aria-label={`Open Event Explorer for workspace ${w.name}`}
              >
                <p className="truncate text-sm font-medium text-foreground">{w.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasSeven && events7dByWorkspaceId?.[w.id] != null
                    ? `${events7dByWorkspaceId[w.id].toLocaleString()} in last 7d`
                    : null}
                  {hasSeven && events7dByWorkspaceId?.[w.id] != null ? ' · ' : ''}
                  {w.monthlyEvents == null ? 'MTD unavailable' : `${w.monthlyEvents.toLocaleString()} MTD`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
