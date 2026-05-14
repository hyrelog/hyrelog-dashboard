'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Download, ExternalLink, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardExportJobSummary, DashboardExportTemplateSummary } from '@/lib/hyrelog-api';
import {
  exportDownloadUiState,
  exportJobSummaryToExplorerHref,
  exportStatusBadgeTone,
  formatExportFiltersSummaryLines,
  formatExportStatusLabel,
  formatRequestedByLine,
} from '@/lib/exports/export-job-ui';
import { ExportJobDetailDrawer } from '@/components/exports/ExportJobDetailDrawer';
import { runExportTemplateAction } from '@/actions/exports';
import { toast } from 'sonner';
import { trackExportEvent } from '@/lib/analytics/export-events';

function formatNumber(value: string) {
  try {
    return BigInt(value).toLocaleString();
  } catch {
    return value;
  }
}

/** Compact two-line stamp for dense tables (UTC). */
function formatExportTableStamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return { date: `${y}-${mo}-${da}`, time: `${h}:${mi} UTC` };
}

function formatRowLimit(value: string) {
  try {
    const big = BigInt(value);
    if (big >= BigInt('999999999999')) return 'Plan max';
    return big.toLocaleString();
  } catch {
    return value;
  }
}

function statusBadgeClass(tone: ReturnType<typeof exportStatusBadgeTone>) {
  if (tone === 'success') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100';
  if (tone === 'progress') return 'border-sky-500/40 bg-sky-500/10 text-sky-950 dark:text-sky-100';
  if (tone === 'destructive') return '';
  if (tone === 'muted') return 'border-muted-foreground/30 bg-muted text-muted-foreground';
  return 'border-border bg-muted/60 text-foreground';
}

export function ExportsContent({
  jobs,
  error,
  apiConfigured,
  templates,
  templatesError,
}: {
  jobs: DashboardExportJobSummary[];
  error: string | null;
  apiConfigured: boolean;
  templates: DashboardExportTemplateSummary[];
  templatesError: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobFromUrl = searchParams.get('job');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<DashboardExportJobSummary | null>(null);
  const [tplBusyId, setTplBusyId] = useState<string | null>(null);
  const [, startTplRun] = useTransition();

  const needsRefresh = useMemo(
    () => jobs.some((j) => j.status === 'PENDING' || j.status === 'RUNNING'),
    [jobs]
  );

  useEffect(() => {
    if (!needsRefresh || !apiConfigured) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [needsRefresh, apiConfigured, router]);

  useEffect(() => {
    const id = jobFromUrl?.trim();
    if (!id) return;
    const hit = jobs.find((j) => j.id === id);
    setSelectedJobId(id);
    setSelectedSummary(hit ?? null);
    setDrawerOpen(true);
  }, [jobFromUrl, jobs]);

  const setDrawerOpenTracked = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      router.replace('/exports');
    }
  };

  const openDetail = (job: DashboardExportJobSummary) => {
    setSelectedJobId(job.id);
    setSelectedSummary(job);
    setDrawerOpen(true);
    router.replace(`/exports?job=${encodeURIComponent(job.id)}`);
  };

  const runTemplate = (templateId: string) => {
    setTplBusyId(templateId);
    startTplRun(async () => {
      const res = await runExportTemplateAction(templateId);
      setTplBusyId(null);
      if (res.ok) {
        toast.success('Export job queued from template');
        router.replace(`/exports?job=${encodeURIComponent(res.jobId)}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  if (!apiConfigured) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Exports</h1>
        <p className="text-muted-foreground">
          Configure HYRELOG_API_URL and DASHBOARD_SERVICE_TOKEN to view export jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exports</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Monitor streaming export jobs initiated from the dashboard or API. Active jobs expose a one-time evidence
          stream through the dashboard proxy; workspace members only see jobs within their allowed HyreLog workspace
          scope.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {templatesError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {templatesError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Export templates</CardTitle>
          <CardDescription>
            Saved filter and format presets for your company. Running a template always starts a new streaming job — no
            stored export files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Save a template from an export&apos;s detail panel. Templates appear here for quick re-use.
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.format} · {t.source}
                      {t.description ? ` · ${t.description}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    disabled={tplBusyId === t.id}
                    onClick={() => runTemplate(t.id)}
                  >
                    {tplBusyId === t.id ? 'Starting…' : 'Run export'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export jobs</CardTitle>
          <CardDescription>
            Pending jobs expose a single consumer stream. Finished jobs remain listed as audit metadata without a
            re-playable byte stream. Row counts reflect rows written during the stream; the adjacent cap is your
            plan&apos;s maximum rows per export request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center">
              <p className="text-sm font-medium">No export jobs yet</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Create a filtered export from{' '}
                <Link href="/events" className="underline font-medium text-foreground">
                  Event explorer
                </Link>{' '}
                or use the HyreLog API. Jobs appear here as soon as they are queued.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table scrollable={false} className="table-fixed w-full text-xs">
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '24%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 align-bottom">Status</TableHead>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 align-bottom">Format</TableHead>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 align-bottom">Source</TableHead>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 align-bottom">Created</TableHead>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 align-bottom">Finished</TableHead>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 align-bottom leading-tight">
                      <span className="block">Exported</span>
                      <span className="block font-normal text-muted-foreground">Plan max</span>
                    </TableHead>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 align-bottom leading-tight">Requested</TableHead>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 align-bottom">Filters</TableHead>
                    <TableHead className="h-auto whitespace-normal px-1.5 py-2 text-right align-bottom">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => {
                    const tone = exportStatusBadgeTone(j.status);
                    const dl = exportDownloadUiState(j.status);
                    const explorerHref = exportJobSummaryToExplorerHref(j);
                    const created = formatExportTableStamp(j.createdAt);
                    const finished = j.finishedAt ? formatExportTableStamp(j.finishedAt) : null;
                    return (
                      <TableRow
                        key={j.id}
                        className={j.status === 'SUCCEEDED' ? 'bg-emerald-500/4' : undefined}
                      >
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2">
                          <Badge
                            variant={tone === 'destructive' ? 'destructive' : 'outline'}
                            className={cn('font-normal text-[11px] leading-tight', statusBadgeClass(tone))}
                          >
                            {formatExportStatusLabel(j.status)}
                          </Badge>
                          {j.failureSummary ? (
                            <p className="mt-1 text-[11px] leading-snug text-destructive wrap-break-word">
                              {j.failureSummary}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2 font-medium wrap-break-word">
                          {j.format}
                        </TableCell>
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2 text-muted-foreground wrap-break-word">
                          {j.source}
                        </TableCell>
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2 text-muted-foreground leading-tight">
                          <span className="block tabular-nums">{created.date}</span>
                          <span className="block text-[10px] text-muted-foreground/90">{created.time}</span>
                        </TableCell>
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2 text-muted-foreground leading-tight">
                          {finished ? (
                            <>
                              <span className="block tabular-nums">{finished.date}</span>
                              <span className="block text-[10px] text-muted-foreground/90">{finished.time}</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2 text-muted-foreground">
                          <div className="flex flex-col gap-0.5 leading-tight">
                            <span className="text-foreground tabular-nums">{formatNumber(j.rowsExported)}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {formatRowLimit(j.rowLimit)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2 text-[11px] leading-snug wrap-break-word">
                          {formatRequestedByLine(j.requestedByType)}
                        </TableCell>
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2 text-[11px] text-muted-foreground wrap-break-word">
                          <div className="flex flex-col gap-1">
                            {formatExportFiltersSummaryLines(j.filtersSummary, j).map((line, idx) => (
                              <p key={`${j.id}-f-${idx}`} className="leading-snug">
                                {line}
                              </p>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 align-top whitespace-normal px-1.5 py-2 text-right">
                          <div className="flex w-full flex-col items-stretch gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-full justify-start gap-1 px-2 text-xs"
                              onClick={() => openDetail(j)}
                            >
                              <Eye className="h-3.5 w-3.5 shrink-0" />
                              Details
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-full justify-start gap-1 px-2 text-xs"
                              asChild
                            >
                              <Link href={explorerHref} className="flex w-full items-center gap-1">
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                Open in Event Explorer
                              </Link>
                            </Button>
                            {dl.kind === 'available' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                className="h-8 w-full justify-start gap-1 px-2 text-xs"
                                asChild
                              >
                                <a
                                  href={`/api/exports/${encodeURIComponent(j.id)}/download`}
                                  className="flex w-full items-center gap-1"
                                  onClick={() => trackExportEvent('export_download_started', { jobId: j.id })}
                                >
                                  <Download className="h-3.5 w-3.5 shrink-0" />
                                  Open stream
                                </a>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8 w-full justify-start gap-1 px-2 text-xs"
                                disabled
                                title={dl.label}
                              >
                                <Download className="h-3.5 w-3.5 shrink-0" />
                                Stream
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-full justify-start gap-1 px-2 text-xs"
                              title="Copy job ID"
                              onClick={() => void navigator.clipboard.writeText(j.id)}
                            >
                              <Copy className="h-3.5 w-3.5 shrink-0" />
                              Copy ID
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <Link href="/events" className="text-brand-600 hover:underline font-medium">
              Open in Event Explorer
            </Link>
            <span aria-hidden>·</span>
            <Link href="/reference" className="text-brand-600 hover:underline font-medium">
              API reference
            </Link>
          </div>
        </CardContent>
      </Card>

      <ExportJobDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpenTracked}
        jobId={selectedJobId}
        listSummary={selectedSummary}
      />
    </div>
  );
}
