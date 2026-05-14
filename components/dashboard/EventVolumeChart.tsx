'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type {
  EventVolumeRangeHistogram,
  EventVolumeRangeKey,
  EventVolumeRangeTotal
} from '@/lib/dashboard/types';
import { buildEventExplorerUrl, buildWorkspaceEventsUrl } from '@/lib/dashboard/drilldown';
import { normalizeTotalsToSegments, orderedRangeTotals } from '@/lib/dashboard/metrics';
import { formatCompactNumber } from '@/lib/dashboard/formatters';
import { cn } from '@/lib/utils';

interface EventVolumeChartProps {
  rangeTotals: EventVolumeRangeTotal[];
  volumeHistograms: Partial<Record<EventVolumeRangeKey, EventVolumeRangeHistogram>>;
  volumeHistogramsPartial: boolean;
  eventVolumeHistogramSource: 'native' | 'partitioned';
  note: string;
  apiConfigured: boolean;
  /** Prisma workspace id for MEMBER-scoped explorer links. */
  workspaceDashboardId?: string | null;
}

function explorerHrefForRange(
  from: string,
  to: string,
  workspaceDashboardId?: string | null
): string {
  return workspaceDashboardId
    ? buildWorkspaceEventsUrl(workspaceDashboardId, { from, to })
    : buildEventExplorerUrl({ from, to });
}

function bucketHeights(h: EventVolumeRangeHistogram | undefined): number[] {
  if (!h?.buckets.length) return [];
  const max = Math.max(1, ...h.buckets.map((b) => b.count));
  return h.buckets.map((b) => Math.round((b.count / max) * 100));
}

export function EventVolumeChart({
  rangeTotals,
  volumeHistograms,
  volumeHistogramsPartial,
  eventVolumeHistogramSource,
  note,
  apiConfigured,
  workspaceDashboardId
}: EventVolumeChartProps) {
  const ordered = useMemo(() => orderedRangeTotals(rangeTotals), [rangeTotals]);
  const [selected, setSelected] = useState<EventVolumeRangeKey>('24h');

  const segments = useMemo(() => normalizeTotalsToSegments(ordered), [ordered]);
  const selectedWindow = ordered.find((t) => t.key === selected) ?? ordered[0];
  const selectedTotal = selectedWindow?.total ?? 0;
  const selectedHist = volumeHistograms[selected];
  const bucketSegs = useMemo(() => bucketHeights(selectedHist), [selectedHist]);

  if (!apiConfigured) {
    return (
      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
        <CardHeader>
          <CardTitle className="text-lg">Event volume</CardTitle>
          <CardDescription>HyreLog API is not configured in this environment.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (ordered.length === 0) {
    return (
      <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
        <CardHeader>
          <CardTitle className="text-lg">Event volume</CardTitle>
          <CardDescription>
            No HyreLog totals loaded yet. Check API connectivity or try again shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const histMax =
    selectedHist && selectedHist.buckets.length > 0
      ? Math.max(...selectedHist.buckets.map((b) => b.count))
      : 0;

  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Event volume</CardTitle>
          <CardDescription>{note}</CardDescription>
          {volumeHistogramsPartial && eventVolumeHistogramSource === 'partitioned' ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              At least one UTC bucket series may be incomplete—compare headline totals to bars if
              something looks off.
            </p>
          ) : null}
          {volumeHistogramsPartial && eventVolumeHistogramSource === 'native' ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              At least one window is flagged partial (API truncation or sum drift vs the headline
              total).
            </p>
          ) : null}
        </div>
        <div
          className="flex flex-wrap gap-1"
          role="tablist"
          aria-label="Time range"
        >
          {ordered.map((t) => {
            const active = t.key === selected;
            return (
              <Button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                variant={active ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setSelected(t.key)}
              >
                {t.key}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="min-h-22">
          <p className="text-sm text-muted-foreground">Selected window total</p>
          <Link
            href={explorerHrefForRange(
              selectedWindow.from,
              selectedWindow.to,
              workspaceDashboardId
            )}
            className="group block cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open Event Explorer for ${selectedWindow.label}`}
          >
            <p className="text-3xl font-semibold tabular-nums text-foreground transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
              {formatCompactNumber(selectedTotal)}
            </p>
          </Link>
          <p className="text-xs text-muted-foreground">
            {selectedWindow.label} · HyreLog filter total
          </p>
        </div>

        <div
          className="space-y-2"
          role="img"
          aria-label="Totals compared across rolling windows"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Window comparison
          </p>
          <div className="flex h-36 min-h-36 items-end gap-2 border-b border-border/50 pb-1">
            {ordered.map((t, i) => {
              const h = Math.max(8, segments[i] ?? 0);
              const active = t.key === selected;
              return (
                <Link
                  key={t.key}
                  href={explorerHrefForRange(t.from, t.to, workspaceDashboardId)}
                  className={cn(
                    'group flex flex-1 flex-col items-center justify-end gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
                    active ? 'opacity-100' : 'opacity-80'
                  )}
                  aria-label={`Open Event Explorer: ${t.label}, ${formatCompactNumber(t.total)} events`}
                >
                  <div
                    className="relative w-full max-w-16
                   flex-1"
                  >
                    <div
                      className={cn(
                        'absolute bottom-0 left-0 right-0 rounded-t-lg bg-linear-to-t from-brand-700/90 to-brand-500/80 transition-all dark:from-brand-600/90 dark:to-brand-400/70',
                        active ? 'ring-2 ring-brand-300/80' : 'group-hover:opacity-90'
                      )}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t.key}
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Relative bar heights compare HyreLog totals across windows (not intra-window time).
          </p>
        </div>

        <div className="space-y-3 border-t border-border/40 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                UTC buckets · {selected}
              </p>
              <p className="text-xs text-muted-foreground">
                {eventVolumeHistogramSource === 'native'
                  ? 'Each bar is an exact HyreLog count for that native UTC time bucket.'
                  : 'Each bucket is a separate HyreLog count for that sub-range.'}
              </p>
            </div>
            {histMax > 0 ? (
              <p className="text-xs tabular-nums text-muted-foreground">
                Axis max: {formatCompactNumber(histMax)}
              </p>
            ) : null}
          </div>

          {selectedHist && selectedHist.buckets.length > 0 ? (
            <>
              <div className="flex h-48 min-h-48 items-end gap-1 sm:gap-2">
                {selectedHist.buckets.map((b, i) => {
                  const barH = Math.max(6, bucketSegs[i] ?? 0);
                  return (
                    <Link
                      key={`${b.from}-${b.to}`}
                      href={explorerHrefForRange(b.from, b.to, workspaceDashboardId)}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1 cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Open Event Explorer for UTC bucket ${b.label} (${formatCompactNumber(b.count)} events)`}
                    >
                      <div
                        className="relative w-full flex-1"
                        title={`${formatCompactNumber(b.count)} events`}
                      >
                        <div
                          className={cn(
                            'absolute bottom-0 left-0 right-0 mx-auto max-w-9 rounded-t-md bg-linear-to-t from-slate-700/90 to-slate-500/75 dark:from-slate-500/90 dark:to-slate-400/70',
                            selectedHist.incomplete && 'opacity-80'
                          )}
                          style={{ height: `${barH}%` }}
                        />
                      </div>
                      <span className="mt-1 block max-w-full truncate text-center text-[9px] font-medium leading-tight text-muted-foreground sm:text-[10px]">
                        {b.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
              {selectedHist.incomplete ? (
                <p className="text-xs text-muted-foreground">
                  {eventVolumeHistogramSource === 'native'
                    ? 'This window is flagged incomplete (partial data or sum drift vs the headline total). Treat the shape as indicative.'
                    : 'This bucket series is flagged incomplete (failed slice or sum drift vs the window total). Treat the shape as indicative.'}
                </p>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No UTC sub-buckets loaded for this window yet. Window totals above remain valid when
                HyreLog returns them.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
