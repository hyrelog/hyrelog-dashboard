import type { EventsExplorerUrlState } from '@/lib/events/explorer-url';
import { formatExplorerChipDate } from '@/lib/events/explorer-url';
import type { DashboardExportCreateBody } from '@/lib/hyrelog-api';
import type { CompanyRole } from '@/types/dashboard';
import { isCompanyLevelRole } from '@/lib/dashboard/types';
import { z } from 'zod';

export type ExplorerExportFormatUi = 'csv' | 'json';

/**
 * Build HyreLog export create payload from resolved HyreLog workspace id and Explorer filter state.
 * Does not validate RBAC — caller must resolve `hyrelogWorkspaceId` with `resolveExplorerHyrelogWorkspace`.
 */
export function buildDashboardExportCreateBody(args: {
  hyrelogWorkspaceId: string | null;
  explorer: Pick<EventsExplorerUrlState, 'from' | 'to' | 'category' | 'action'>;
  format: ExplorerExportFormatUi;
  savedExplorerViewId?: string | null;
}): DashboardExportCreateBody {
  const format = args.format === 'csv' ? 'CSV' : 'JSONL';
  const filters: NonNullable<DashboardExportCreateBody['filters']> = {};
  if (args.hyrelogWorkspaceId) filters.workspaceId = args.hyrelogWorkspaceId;
  if (args.explorer.from) filters.from = args.explorer.from;
  if (args.explorer.to) filters.to = args.explorer.to;
  if (args.explorer.category?.trim()) filters.category = args.explorer.category.trim();
  if (args.explorer.action?.trim()) filters.action = args.explorer.action.trim();
  const sid = args.savedExplorerViewId?.trim();
  return {
    format,
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    ...(sid ? { savedExplorerViewId: sid } : {}),
  };
}

/** True when no time/category/action/workspace filters narrow the export (large export risk). */
export function explorerExportHasNoNarrowingFilters(args: {
  hyrelogWorkspaceId: string | null;
  explorer: Pick<EventsExplorerUrlState, 'from' | 'to' | 'category' | 'action' | 'dashboardWorkspaceId'>;
  /** Server merges this view's filters; treat as narrowing for admin warning heuristics. */
  savedExplorerViewId?: string | null;
}): boolean {
  const sid = args.savedExplorerViewId?.trim();
  if (sid && z.string().uuid().safeParse(sid).success) {
    return false;
  }
  const hasWs = Boolean(args.hyrelogWorkspaceId || args.explorer.dashboardWorkspaceId);
  const hasTime = Boolean(args.explorer.from || args.explorer.to);
  const hasCatAct = Boolean(args.explorer.category?.trim() || args.explorer.action?.trim());
  return !hasWs && !hasTime && !hasCatAct;
}

export function formatExplorerFiltersSummary(args: {
  workspaceLabel: string | null;
  explorer: EventsExplorerUrlState;
  companyRole: CompanyRole;
}): string[] {
  const lines: string[] = [];
  if (args.workspaceLabel) {
    lines.push(`Workspace: ${args.workspaceLabel}`);
  } else if (args.explorer.dashboardWorkspaceId) {
    lines.push(`Workspace: ${args.explorer.dashboardWorkspaceId}`);
  } else if (isCompanyLevelRole(args.companyRole)) {
    lines.push('Workspace: All workspaces');
  } else {
    lines.push('Workspace: (scoped to your access)');
  }
  if (args.explorer.from) lines.push(`From: ${formatExplorerChipDate(args.explorer.from)}`);
  if (args.explorer.to) lines.push(`To: ${formatExplorerChipDate(args.explorer.to)}`);
  if (args.explorer.category) lines.push(`Category: ${args.explorer.category}`);
  if (args.explorer.action) lines.push(`Action: ${args.explorer.action}`);
  lines.push(`Sort: ${args.explorer.sort} (${args.explorer.order}) — export order follows server defaults, not this sort.`);
  return lines;
}
