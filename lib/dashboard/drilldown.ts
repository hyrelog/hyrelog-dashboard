/**
 * Event Explorer URL + HyreLog list filter audit (dashboard ↔ API)
 *
 * **Supported on `/events` URL (server `page.tsx` → Explorer UI + initial fetch):**
 * - `workspaceId` — Prisma `Workspace.id` (UUID). Resolved server-side to `apiWorkspaceId` for HyreLog.
 * - `from`, `to` — ISO 8601 strings passed through to `getDashboardEvents` / Explorer filter state.
 * - `category`, `action` — passed through to list queries and initial filter chips.
 *
 * **Supported by HyreLog `getDashboardEvents` / `DashboardEventsParams` only (no URL wiring yet):**
 * - `limit`, `offset`, `sort`, `order`, `projectId`
 *
 * **Not supported as list filters today (omit from URLs; server would ignore):**
 * - `actor` / `actorId`, `resource` / `resourceType`, `region`, `traceId`, `eventId`
 *
 * Event detail: no dedicated `/events/[id]` route — use Explorer with time + category + action.
 */

import type { DashboardEventRow } from '@/lib/dashboard/types';

const MAX_FILTER_LEN = 256;

function trimFilter(value: string): string {
  const t = value.trim();
  if (!t) return '';
  return t.length > MAX_FILTER_LEN ? t.slice(0, MAX_FILTER_LEN) : t;
}

export type ExplorerTimeRange = { from: string; to: string };

/** Query keys emitted on `/events` that the dashboard honors end-to-end. */
export type EventExplorerUrlFilters = {
  /** Dashboard (Prisma) workspace id — never the raw HyreLog API workspace id in URLs. */
  workspaceId?: string;
  from?: string;
  to?: string;
  category?: string;
  action?: string;
};

function appendFilterParams(params: URLSearchParams, filters: EventExplorerUrlFilters): void {
  if (filters.workspaceId) params.set('workspaceId', filters.workspaceId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const cat = filters.category ? trimFilter(filters.category) : '';
  const act = filters.action ? trimFilter(filters.action) : '';
  if (cat) params.set('category', cat);
  if (act) params.set('action', act);
  params.set('ref', 'dashboard');
}

/** Base `/events` with only supported params (uses `URLSearchParams` encoding). */
export function buildEventExplorerUrl(filters: EventExplorerUrlFilters): string {
  const params = new URLSearchParams();
  appendFilterParams(params, filters);
  const q = params.toString();
  return q ? `/events?${q}` : '/events';
}

/** Scoped Event Explorer URL; `workspaceId` is the Prisma dashboard workspace id. */
export function buildWorkspaceEventsUrl(
  workspaceId: string,
  filters: Omit<EventExplorerUrlFilters, 'workspaceId'> = {}
): string {
  return buildEventExplorerUrl({ ...filters, workspaceId });
}

export function buildActionDrilldownUrl(
  action: string,
  range: ExplorerTimeRange,
  workspaceDashboardId?: string | null
): string {
  const a = trimFilter(action);
  if (!a) return workspaceDashboardId ? buildWorkspaceEventsUrl(workspaceDashboardId, range) : buildEventExplorerUrl(range);
  return workspaceDashboardId
    ? buildWorkspaceEventsUrl(workspaceDashboardId, { ...range, action: a })
    : buildEventExplorerUrl({ ...range, action: a });
}

export function buildCategoryDrilldownUrl(
  category: string,
  range: ExplorerTimeRange,
  workspaceDashboardId?: string | null
): string {
  const c = trimFilter(category);
  if (!c) return workspaceDashboardId ? buildWorkspaceEventsUrl(workspaceDashboardId, range) : buildEventExplorerUrl(range);
  return workspaceDashboardId
    ? buildWorkspaceEventsUrl(workspaceDashboardId, { ...range, category: c })
    : buildEventExplorerUrl({ ...range, category: c });
}

/**
 * Actor-scoped Explorer URL.
 * TODO: `DashboardEventsParams` / HyreLog dashboard events list has no `actorId` filter — return null until API supports it.
 */
export function buildActorDrilldownUrl(_actorId: string, _range: ExplorerTimeRange): string | null {
  return null;
}

/** No `/events/[eventId]` route exists — callers should use {@link buildExplorerUrlForFeedRow}. */
export function buildEventDetailUrl(_eventId: string): string | null {
  return null;
}

function clampIsoRange(from: string, to: string, sampleFrom: string, sampleTo: string): ExplorerTimeRange {
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  const sf = new Date(sampleFrom).getTime();
  const st = new Date(sampleTo).getTime();
  if (Number.isNaN(f) || Number.isNaN(t) || t < f) return { from, to };
  if (!Number.isNaN(sf) && !Number.isNaN(st) && st >= sf) {
    return {
      from: new Date(Math.max(f, sf)).toISOString(),
      to: new Date(Math.min(t, st)).toISOString(),
    };
  }
  return { from, to };
}

/** Best-effort Explorer deep-link for a dashboard feed row (no `eventId` URL support). */
export function buildExplorerUrlForFeedRow(
  event: Pick<DashboardEventRow, 'timestamp' | 'category' | 'action'>,
  opts: ExplorerTimeRange & { workspaceDashboardId?: string | null }
): string {
  const t = new Date(event.timestamp).getTime();
  const padMs = 60 * 60 * 1000;
  let from = new Date(t - padMs).toISOString();
  let to = new Date(t + padMs).toISOString();
  ({ from, to } = clampIsoRange(from, to, opts.from, opts.to));
  const base: EventExplorerUrlFilters = {
    from,
    to,
    category: trimFilter(event.category) || undefined,
    action: trimFilter(event.action) || undefined,
  };
  if (opts.workspaceDashboardId) {
    return buildWorkspaceEventsUrl(opts.workspaceDashboardId, base);
  }
  return buildEventExplorerUrl(base);
}
