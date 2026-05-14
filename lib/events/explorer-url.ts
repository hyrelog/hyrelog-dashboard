import type { CompanyRole } from '@/types/dashboard';
import { isCompanyLevelRole } from '@/lib/dashboard/types';
import { eventsExplorerQuerySchema } from '@/schemas/events';

export const EXPLORER_SORT_KEYS = ['timestamp', 'category', 'action', 'id'] as const;
export type ExplorerSortKey = (typeof EXPLORER_SORT_KEYS)[number];

export const EXPLORER_PAGE_SIZES = [10, 20, 50, 100, 200] as const;
export type ExplorerPageSize = (typeof EXPLORER_PAGE_SIZES)[number];

export type EventsExplorerUrlState = {
  /** Prisma `Workspace.id` (UUID), never HyreLog API workspace id. */
  dashboardWorkspaceId: string;
  /** Prisma `SavedExplorerView.id` on API; empty when not running a named saved view. */
  savedExplorerViewId: string;
  from: string;
  to: string;
  category: string;
  action: string;
  sort: ExplorerSortKey;
  order: 'asc' | 'desc';
  page: number;
  pageSize: ExplorerPageSize;
  /** When `dashboard`, UI may show a back link to the home dashboard. */
  ref: '' | 'dashboard';
};

const FILTER_MAX = 256;

function firstString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

function trimFilter(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  return t.length > FILTER_MAX ? t.slice(0, FILTER_MAX) : t;
}

function parseOptionalIso(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function parseWorkspaceId(raw: string): string {
  const t = raw.trim();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(t) ? t : '';
}

function parseSavedExplorerViewId(raw: string): string {
  return parseWorkspaceId(raw);
}

function parseSort(raw: string): ExplorerSortKey {
  const s = raw.trim().toLowerCase();
  if (s === 'id' || s === 'timestamp' || s === 'category' || s === 'action') return s;
  return 'timestamp';
}

function parseOrder(raw: string): 'asc' | 'desc' {
  return raw.trim().toLowerCase() === 'asc' ? 'asc' : 'desc';
}

function parsePage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 1_000_000);
}

function parsePageSize(raw: string): ExplorerPageSize {
  const n = Number.parseInt(raw, 10);
  const allowed = new Set<number>(EXPLORER_PAGE_SIZES);
  if (!allowed.has(n)) return 10;
  return n as ExplorerPageSize;
}

function parseRef(raw: string): '' | 'dashboard' {
  return raw.trim().toLowerCase() === 'dashboard' ? 'dashboard' : '';
}

/** Defaults for URL parsing (server + client). */
export function defaultExplorerUrlState(): EventsExplorerUrlState {
  return {
    dashboardWorkspaceId: '',
    savedExplorerViewId: '',
    from: '',
    to: '',
    category: '',
    action: '',
    sort: 'timestamp',
    order: 'desc',
    page: 1,
    pageSize: 10,
    ref: '',
  };
}

const EXPLORER_QUERY_KEYS = [
  'workspaceId',
  'savedView',
  'from',
  'to',
  'category',
  'action',
  'sort',
  'order',
  'page',
  'pageSize',
  'ref',
] as const;

const FLAT_MAX_LEN: Record<(typeof EXPLORER_QUERY_KEYS)[number], number> = {
  workspaceId: 64,
  savedView: 40,
  from: 80,
  to: 80,
  category: 256,
  action: 256,
  sort: 32,
  order: 8,
  page: 40,
  pageSize: 16,
  ref: 32,
};

/**
 * Pick only Explorer query keys and clamp lengths so `eventsExplorerQuerySchema.safeParse` never rejects
 * on oversized values. Unknown keys are ignored.
 */
export function flattenExplorerSearchParamsForSchema(
  searchParams: Record<string, string | string[] | undefined>
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of EXPLORER_QUERY_KEYS) {
    const raw = firstString(searchParams[key]).trim();
    if (!raw) {
      out[key] = undefined;
      continue;
    }
    const max = FLAT_MAX_LEN[key];
    out[key] = raw.length > max ? raw.slice(0, max) : raw;
  }
  return out;
}

/**
 * Parse a pre-flattened Explorer query record (e.g. after {@link flattenExplorerSearchParamsForSchema}).
 * Runs `eventsExplorerQuerySchema.safeParse` then normalizes dates, enums, and pagination.
 */
export function parseEventsExplorerSearchParamsFromFlat(
  flat: Record<string, string | undefined>
): EventsExplorerUrlState {
  const safe = eventsExplorerQuerySchema.safeParse(flat);
  const d = safe.success ? safe.data : {};

  return {
    dashboardWorkspaceId: parseWorkspaceId(d.workspaceId ?? ''),
    savedExplorerViewId: parseSavedExplorerViewId(d.savedView ?? ''),
    from: parseOptionalIso(d.from ?? ''),
    to: parseOptionalIso(d.to ?? ''),
    category: trimFilter(d.category ?? ''),
    action: trimFilter(d.action ?? ''),
    sort: parseSort(d.sort ?? ''),
    order: parseOrder(d.order ?? ''),
    page: parsePage(d.page ?? ''),
    pageSize: parsePageSize(d.pageSize ?? ''),
    ref: parseRef(d.ref ?? ''),
  };
}

/**
 * Parse Next.js `searchParams` into explorer UI state.
 * Uses `eventsExplorerQuerySchema.safeParse` on whitelisted, length-clamped keys; unknown params are ignored.
 * Invalid dates, sort keys, page numbers, etc. fall back via the normalizers below (never throws).
 */
export function parseEventsExplorerSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): EventsExplorerUrlState {
  return parseEventsExplorerSearchParamsFromFlat(flattenExplorerSearchParamsForSchema(searchParams));
}

export function buildEventsExplorerSearchParams(state: EventsExplorerUrlState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.dashboardWorkspaceId) p.set('workspaceId', state.dashboardWorkspaceId);
  if (state.savedExplorerViewId) p.set('savedView', state.savedExplorerViewId);
  if (state.from) p.set('from', state.from);
  if (state.to) p.set('to', state.to);
  if (state.category) p.set('category', state.category);
  if (state.action) p.set('action', state.action);
  if (state.sort !== 'timestamp') p.set('sort', state.sort);
  if (state.order !== 'desc') p.set('order', state.order);
  if (state.page !== 1) p.set('page', String(state.page));
  if (state.pageSize !== 10) p.set('pageSize', String(state.pageSize));
  if (state.ref === 'dashboard') p.set('ref', 'dashboard');
  return p;
}

export function explorerPathWithQuery(state: EventsExplorerUrlState): string {
  const q = buildEventsExplorerSearchParams(state).toString();
  return q ? `/events?${q}` : '/events';
}

export type ExplorerChipKey = 'workspace' | 'category' | 'action' | 'from' | 'to';

/**
 * Returns URL param updates when removing a chip. Workspace chip is a no-op when locked (single-workspace member).
 */
export function chipRemovalStateUpdate(
  chip: ExplorerChipKey,
  current: EventsExplorerUrlState,
  opts: { workspaceChipLocked: boolean }
): Partial<EventsExplorerUrlState> {
  switch (chip) {
    case 'workspace':
      if (opts.workspaceChipLocked) return {};
      return { dashboardWorkspaceId: '', page: 1, savedExplorerViewId: '' };
    case 'category':
      return { category: '', page: 1, savedExplorerViewId: '' };
    case 'action':
      return { action: '', page: 1, savedExplorerViewId: '' };
    case 'from':
      return { from: '', page: 1, savedExplorerViewId: '' };
    case 'to':
      return { to: '', page: 1, savedExplorerViewId: '' };
    default:
      return {};
  }
}

/** True when the workspace filter chip should be non-removable (implicit single scope). */
export function isWorkspaceChipLockedForRole(
  companyRole: CompanyRole,
  permittedWorkspaceCount: number
): boolean {
  if (isCompanyLevelRole(companyRole)) return false;
  return permittedWorkspaceCount <= 1;
}

/**
 * Default filters after "Reset" — clears optional filters only.
 * Company roles: workspace cleared (company-wide).
 * Workspace members: keeps the current dashboard workspace when still permitted; otherwise first permitted id.
 */
export function buildResetExplorerFilters(
  companyRole: CompanyRole,
  permittedWorkspaceIdsOrdered: string[],
  currentDashboardWorkspaceId: string
): Pick<
  EventsExplorerUrlState,
  | 'dashboardWorkspaceId'
  | 'category'
  | 'action'
  | 'from'
  | 'to'
  | 'page'
  | 'sort'
  | 'order'
  | 'savedExplorerViewId'
> {
  const base = {
    category: '',
    action: '',
    from: '',
    to: '',
    page: 1,
    sort: 'timestamp' as ExplorerSortKey,
    order: 'desc' as const,
    savedExplorerViewId: '' as const,
  };
  if (isCompanyLevelRole(companyRole)) {
    return { ...base, dashboardWorkspaceId: '' };
  }
  const permitted = new Set(permittedWorkspaceIdsOrdered);
  const keep =
    currentDashboardWorkspaceId && permitted.has(currentDashboardWorkspaceId)
      ? currentDashboardWorkspaceId
      : (permittedWorkspaceIdsOrdered[0] ?? '');
  return { ...base, dashboardWorkspaceId: keep };
}

export function formatExplorerChipDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
}
