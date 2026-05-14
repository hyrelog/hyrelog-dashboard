'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy, X, Download, ExternalLink, RotateCcw, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getExportJobAction, rerunExportAction } from '@/actions/exports';
import type { DashboardExportJobDetail, DashboardExportJobSummary } from '@/lib/hyrelog-api';
import {
  exportDownloadUiState,
  exportJobSummaryToExplorerHref,
  exportLifecycleDetail,
  exportLifecycleHeadline,
  formatExportFiltersSummaryLines,
  formatExportStatusLabel,
  formatRequestedByLine,
} from '@/lib/exports/export-job-ui';
import { SaveExportTemplateDialog } from '@/components/exports/SaveExportTemplateDialog';
import { trackExportEvent } from '@/lib/analytics/export-events';

type ExportJobDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string | null;
  listSummary: DashboardExportJobSummary | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm wrap-break-word">{children}</div>
    </div>
  );
}

function TimelineDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'mt-1.5 h-2 w-2 shrink-0 rounded-full border',
        active ? 'border-primary bg-primary' : 'border-muted-foreground/40 bg-muted'
      )}
    />
  );
}

export function ExportJobDetailDrawer({ open, onOpenChange, jobId, listSummary }: ExportJobDetailDrawerProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<DashboardExportJobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [rerunBusy, setRerunBusy] = useState(false);

  useEffect(() => {
    if (!open || !jobId) {
      setDetail(null);
      setError(null);
      return;
    }
    startTransition(async () => {
      setError(null);
      const res = await getExportJobAction(jobId);
      if (res.ok && res.job) {
        setDetail(res.job);
        trackExportEvent('export_viewed', { jobId });
      } else {
        setDetail(null);
        setError(res.ok ? 'Job not found' : res.error);
      }
    });
  }, [open, jobId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open || !jobId) return null;

  const d = detail;
  const s = listSummary;
  const status = d?.status ?? s?.status ?? '';
  const format = d?.format ?? s?.format ?? '';
  const source = d?.source ?? s?.source ?? '';
  const rows = d?.rowsExported ?? s?.rowsExported ?? '0';
  const rowLimit = d?.rowLimit ?? s?.rowLimit ?? '';
  const filtersSummary = d?.filtersSummary ?? s?.filtersSummary ?? {};
  const jobScopeForFilters =
    d != null
      ? { workspaceId: d.workspaceId, workspaceName: d.workspaceName }
      : s != null
        ? { workspaceId: s.workspaceId, workspaceName: s.workspaceName }
        : null;
  const explorerHref = exportJobSummaryToExplorerHref({
    filtersSummary,
    explorerDashboardWorkspaceId: d?.explorerDashboardWorkspaceId ?? s?.explorerDashboardWorkspaceId ?? null,
  });
  const downloadState = exportDownloadUiState(status);
  const failure = d?.failureSummary ?? s?.failureSummary ?? null;
  const lifecycleDetail = exportLifecycleDetail(status);
  const canRerun = status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED';

  const workspaceScopeLine =
    d?.workspaceName ?? s?.workspaceName ?? (s?.workspaceId || d?.workspaceId ? 'Single workspace (see filters)' : 'Company-wide');

  const copyId = () => {
    void navigator.clipboard.writeText(jobId);
  };

  const onRerun = () => {
    setRerunBusy(true);
    void (async () => {
      const res = await rerunExportAction(jobId);
      setRerunBusy(false);
      if (res.ok) {
        toast.success('New export job queued');
        router.replace(`/exports?job=${encodeURIComponent(res.jobId)}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    })();
  };

  const defaultTemplateName =
    (filtersSummary.category ? `${filtersSummary.category} ` : '') +
    (format ? `${format} export` : 'Export template');

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={() => onOpenChange(false)}
      />
      <aside className="relative flex h-full max-h-dvh w-full max-w-full flex-col overflow-y-auto border-l bg-background shadow-xl animate-in slide-in-from-right duration-200 sm:max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">Export evidence</h2>
            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">{jobId}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {isPending && !d ? <p className="text-sm text-muted-foreground">Loading details…</p> : null}

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">{exportLifecycleHeadline(status)}</p>
            {lifecycleDetail ? <p className="text-xs text-muted-foreground mt-1">{lifecycleDetail}</p> : null}
            <p className="text-xs text-muted-foreground mt-2">
              Status: <span className="text-foreground">{formatExportStatusLabel(status)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyId}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy job ID
            </Button>
            {downloadState.kind === 'available' ? (
              <Button type="button" size="sm" asChild>
                <a
                  href={`/api/exports/${encodeURIComponent(jobId)}/download`}
                  onClick={() => trackExportEvent('export_download_started', { jobId })}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {downloadState.label}
                </a>
              </Button>
            ) : (
              <Button type="button" size="sm" variant="secondary" disabled>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {downloadState.label}
              </Button>
            )}
            {canRerun ? (
              <Button type="button" size="sm" variant="outline" onClick={onRerun} disabled={rerunBusy}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {rerunBusy ? 'Queuing…' : 'Re-run export'}
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={() => setSaveTplOpen(true)}>
              <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />
              Save as template
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={explorerHref}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open in Event Explorer
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Export lifecycle</p>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <TimelineDot active />
                <div>
                  <p className="text-sm font-medium">Generated at</p>
                  <p className="text-xs text-muted-foreground">{d?.createdAt ?? s?.createdAt ?? '—'}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <TimelineDot active={Boolean(d?.startedAt ?? s?.startedAt)} />
                <div>
                  <p className="text-sm font-medium">Stream started</p>
                  <p className="text-xs text-muted-foreground">{d?.startedAt ?? s?.startedAt ?? '—'}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <TimelineDot active={Boolean(d?.finishedAt ?? s?.finishedAt)} />
                <div>
                  <p className="text-sm font-medium">Stream finished</p>
                  <p className="text-xs text-muted-foreground">{d?.finishedAt ?? s?.finishedAt ?? '—'}</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Generated by">{formatRequestedByLine(d?.requestedByType ?? s?.requestedByType ?? '')}</Field>
            <Field label="Format">{format}</Field>
            <Field label="Source type">{source}</Field>
            <Field label="Rows exported">{rows}</Field>
            <Field label="Plan row cap (per export)">{rowLimit}</Field>
            <Field label="Workspace scope">{workspaceScopeLine}</Field>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Filter summary</p>
            <ul className="text-sm space-y-1 list-disc pl-4">
              {formatExportFiltersSummaryLines(filtersSummary, jobScopeForFilters).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Retention & evidence</p>
            <p>
              Streaming exports are ephemeral at the byte layer: HyreLog does not retain a downloadable artifact or
              storage path for replay after the stream completes. This panel and audit indexes describe the request at
              generation time.
            </p>
            <p className="text-[11px] pt-1 opacity-90">
              {/* TODO: wire optional customer-owned retention policies when productized */}
              Immutable audit records reflect configuration and scope at generation time — not a separate cryptographic
              proof layer.
            </p>
          </div>

          {failure ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {failure}
            </div>
          ) : null}

          {status === 'SUCCEEDED' ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-100">
              <p className="font-medium">Compliance confirmation</p>
              <p className="mt-1 opacity-90">
                This job&apos;s metadata is company-scoped and reflects the filters and workspace boundaries in effect
                when the stream was generated. Use Event Explorer or a new export for a point-in-time refresh.
              </p>
            </div>
          ) : null}

          {d?.evidence ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Audit index</p>
              <p>Job ID: {d.evidence.jobId}</p>
              <p>Company scoped: {d.evidence.companyScoped ? 'yes' : 'no'}</p>
              <p>Requested via: {d.evidence.requestedVia}</p>
            </div>
          ) : null}
        </div>
      </aside>

      <SaveExportTemplateDialog
        open={saveTplOpen}
        onOpenChange={setSaveTplOpen}
        sourceJobId={jobId}
        defaultName={defaultTemplateName.trim() || 'Export template'}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
