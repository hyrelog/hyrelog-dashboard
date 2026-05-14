'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createExplorerExportJobAction } from '@/actions/event-export';
import type { EventsExplorerUrlState } from '@/lib/events/explorer-url';
import {
  explorerExportHasNoNarrowingFilters,
  formatExplorerFiltersSummary,
  type ExplorerExportFormatUi,
} from '@/lib/events/explorer-export-request';
import type { CompanyRole } from '@/types/dashboard';
import { isCompanyLevelRole } from '@/lib/dashboard/types';

type ExportFilteredEventsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explorerState: EventsExplorerUrlState;
  workspaceLabel: string | null;
  hyrelogWorkspaceId: string | null;
  companyRole: CompanyRole;
  exportDisabled: boolean;
  exportDisabledReason?: string | null;
  /** When set, POST /dashboard/exports merges this saved view's filters (URL still shows explorer params). */
  savedExplorerViewId?: string | null;
};

export function ExportFilteredEventsDialog({
  open,
  onOpenChange,
  explorerState,
  workspaceLabel,
  hyrelogWorkspaceId,
  companyRole,
  exportDisabled,
  exportDisabledReason,
  savedExplorerViewId,
}: ExportFilteredEventsDialogProps) {
  const [format, setFormat] = useState<ExplorerExportFormatUi>('csv');
  const [isPending, startTransition] = useTransition();

  const largeExportWarning = explorerExportHasNoNarrowingFilters({
    hyrelogWorkspaceId,
    explorer: explorerState,
    savedExplorerViewId,
  });

  const filterLines = formatExplorerFiltersSummary({ workspaceLabel, explorer: explorerState, companyRole });

  const onConfirm = () => {
    if (exportDisabled) return;
    startTransition(async () => {
      const res = await createExplorerExportJobAction({
        dashboardWorkspaceId: explorerState.dashboardWorkspaceId || null,
        from: explorerState.from || null,
        to: explorerState.to || null,
        category: explorerState.category || null,
        action: explorerState.action || null,
        format,
        savedExplorerViewId: savedExplorerViewId?.trim() || null,
      });
      if (res.ok) {
        toast.success('Export job created', {
          description: (
            <span>
              Job <span className="font-mono text-xs">{res.jobId}</span> is queued.{' '}
              <Link href="/exports" className="underline font-medium">
                View exports
              </Link>
            </span>
          ),
        });
        onOpenChange(false);
      } else {
        toast.error('Export failed', { description: res.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export filtered events</DialogTitle>
          <DialogDescription>
            This export uses the same workspace and manual filters as the explorer URL (workspace, From/To, category,
            action). "All workspaces" with empty From/To/Category/Action is a real scope — it is not missing filters.
            Sort and page size do not change export contents.
          </DialogDescription>
        </DialogHeader>

        {exportDisabled ? (
          <p className="text-sm text-muted-foreground">{exportDisabledReason ?? 'Export is not available right now.'}</p>
        ) : (
          <div className="space-y-4">
            {largeExportWarning && isCompanyLevelRole(companyRole) ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                This may export a large number of events. Add a time range, workspace, category, or action filter to
                narrow the result.
              </div>
            ) : null}
            {largeExportWarning && !isCompanyLevelRole(companyRole) ? (
              <div className="rounded-md border border-muted px-3 py-2 text-sm text-muted-foreground">
                Your export is scoped to permitted workspaces. If the result set is large, consider narrowing the time
                range or filters.
              </div>
            ) : null}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Active filters</p>
              <ul className="text-sm space-y-1 list-disc pl-4">
                {filterLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Format</Label>
              <Select value={format} onValueChange={(v) => (v === 'csv' || v === 'json' ? setFormat(v) : null)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON (JSONL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={exportDisabled || isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
