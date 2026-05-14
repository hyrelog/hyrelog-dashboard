import {
  type EventsExplorerUrlState,
  defaultExplorerUrlState,
  explorerPathWithQuery,
} from '@/lib/events/explorer-url';
import type {
  DashboardExportFiltersSummary,
  DashboardExportJobSummary,
} from '@/lib/hyrelog-api';

/** Optional job row so filter copy can match Event explorer scope (company vs one workspace). */
export type ExportJobScopeForFilterLines = Pick<DashboardExportJobSummary, 'workspaceId' | 'workspaceName'>;

export type ExportDownloadUiState =
  | { kind: 'available'; label: string }
  | { kind: 'wait'; label: string }
  | { kind: 'completed'; label: string }
  | { kind: 'unavailable'; label: string };

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Queued',
  RUNNING: 'Streaming',
  SUCCEEDED: 'Finished',
  FAILED: 'Failed',
  CANCELED: 'Cancelled',
};

export function formatExportStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status.replace(/_/g, ' ');
}

/** Short status line for compliance / lifecycle panels. */
export function exportLifecycleHeadline(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Preparing export stream…';
    case 'RUNNING':
      return 'Streaming export…';
    case 'SUCCEEDED':
      return 'Stream completed';
    case 'FAILED':
      return 'Export stream failed';
    case 'CANCELED':
      return 'Export stream cancelled';
    default:
      return 'Export status unknown';
  }
}

export function exportLifecycleDetail(status: string): string | null {
  switch (status) {
    case 'PENDING':
      return 'The job is queued; open the download link once to receive the ephemeral evidence stream.';
    case 'RUNNING':
      return 'HyreLog is writing rows into the active download stream.';
    case 'SUCCEEDED':
      return 'The one-time stream finished. Audit metadata remains; bytes are not re-served.';
    case 'FAILED':
      return null;
    case 'CANCELED':
      return 'The stream ended before completion (for example, the browser or proxy closed the connection).';
    default:
      return null;
  }
}

export type ExportStatusBadgeTone = 'default' | 'progress' | 'success' | 'destructive' | 'muted';

export function exportStatusBadgeTone(status: string): ExportStatusBadgeTone {
  switch (status) {
    case 'SUCCEEDED':
      return 'success';
    case 'FAILED':
      return 'destructive';
    case 'RUNNING':
      return 'progress';
    case 'CANCELED':
      return 'muted';
    default:
      return 'default';
  }
}

export function formatRequestedByLine(requestedByType: string): string {
  if (requestedByType === 'DASHBOARD_USER') return 'Dashboard';
  if (requestedByType === 'API_KEY') return 'API integration';
  return 'Other';
}

export function formatExportFiltersSummaryLines(
  filters: DashboardExportFiltersSummary,
  job?: ExportJobScopeForFilterLines | null
): string[] {
  const lines: string[] = [];
  if (filters.from) lines.push(`From ${filters.from}`);
  if (filters.to) lines.push(`To ${filters.to}`);
  if (filters.category) lines.push(`Category: ${filters.category}`);
  if (filters.action) lines.push(`Action: ${filters.action}`);

  const hyrelogWorkspaceId = filters.workspaceId || job?.workspaceId || null;
  if (hyrelogWorkspaceId) {
    const name = job?.workspaceName?.trim();
    lines.push(name ? `Workspace: ${name}` : 'Workspace: single-workspace export');
  }

  const hasTimeOrTaxonomy = Boolean(
    filters.from ||
      filters.to ||
      (filters.category && filters.category.trim()) ||
      (filters.action && filters.action.trim())
  );

  if (!hasTimeOrTaxonomy) {
    lines.push(
      hyrelogWorkspaceId
        ? 'No date, category, or action filters — same manual filters as Event explorer when only a workspace is selected.'
        : 'No date, category, action, or workspace filters — same as Event explorer with "All workspaces" and empty From / To / Category / Action (whole company in scope).'
    );
  }

  return lines;
}

/** Single entry point when building an Event Explorer link from an export job row or detail. */
export function exportJobSummaryToExplorerHref(
  job: Pick<DashboardExportJobSummary, 'filtersSummary' | 'explorerDashboardWorkspaceId'>
): string {
  return exportFiltersToExplorerHref({
    filtersSummary: job.filtersSummary,
    explorerDashboardWorkspaceId: job.explorerDashboardWorkspaceId,
  });
}

export function exportFiltersToExplorerHref(args: {
  filtersSummary: DashboardExportFiltersSummary;
  explorerDashboardWorkspaceId: string | null;
}): string {
  const state: EventsExplorerUrlState = {
    ...defaultExplorerUrlState(),
    ...(args.explorerDashboardWorkspaceId
      ? { dashboardWorkspaceId: args.explorerDashboardWorkspaceId }
      : {}),
    from: args.filtersSummary.from ?? '',
    to: args.filtersSummary.to ?? '',
    category: args.filtersSummary.category ?? '',
    action: args.filtersSummary.action ?? '',
  };
  return explorerPathWithQuery(state);
}

export function exportDownloadUiState(status: string): ExportDownloadUiState {
  if (status === 'PENDING') {
    return { kind: 'available', label: 'Open stream' };
  }
  if (status === 'RUNNING') {
    return { kind: 'wait', label: 'Stream in progress…' };
  }
  if (status === 'SUCCEEDED') {
    return {
      kind: 'completed',
      label: 'Stream already consumed — start a new export or re-run to obtain fresh evidence.',
    };
  }
  if (status === 'FAILED' || status === 'CANCELED') {
    return { kind: 'unavailable', label: 'Stream unavailable' };
  }
  return { kind: 'wait', label: 'Awaiting stream…' };
}
