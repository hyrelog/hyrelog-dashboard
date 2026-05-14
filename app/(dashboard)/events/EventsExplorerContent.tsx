'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getEventsFilterOptionsAction } from '@/actions/events';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CompanyRole } from '@/types/dashboard';
import { isCompanyLevelRole } from '@/lib/dashboard/types';
import {
  type EventsExplorerUrlState,
  explorerPathWithQuery,
  chipRemovalStateUpdate,
  isWorkspaceChipLockedForRole,
  buildResetExplorerFilters,
  formatExplorerChipDate,
} from '@/lib/events/explorer-url';
import {
  formatActorCell,
  formatResourceCell,
  formatEventIdShort,
  extractIntegrityHints,
  formatIntegrityBadge,
  extractExplorerRowContext,
} from '@/lib/events/event-row-format';
import type { DrawerEventDetail } from '@/lib/events/event-detail-format';
import { EventDetailDrawer } from '@/components/events/EventDetailDrawer';
import { ExportFilteredEventsDialog } from '@/components/events/ExportFilteredEventsDialog';
import { SaveExplorerViewDialog } from '@/components/events/SaveExplorerViewDialog';
import { SavedExplorerViewsMenu } from '@/components/events/SavedExplorerViewsMenu';
import type { SavedExplorerViewSummary } from '@/lib/hyrelog-api';

type Event = DrawerEventDetail;

type Workspace = { id: string; name: string; apiWorkspaceId: string | null };

type SearchableFilterOption = string | { value: string; label: string };

function normalizeFilterOptions(options: SearchableFilterOption[]): { value: string; label: string }[] {
  if (options.length === 0) return [];
  if (typeof options[0] === 'string') {
    return (options as string[]).map((o) => ({ value: o, label: o }));
  }
  return options as { value: string; label: string }[];
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

type PageSize = 10 | 20 | 50 | 100 | 200;

const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 200, label: '200' },
];

type SortKey = 'id' | 'timestamp' | 'category' | 'action';
type SortDir = 'asc' | 'desc';

function EventSortHeader({
  columnKey,
  sortKey,
  sortDir,
  onSort,
  children,
  className,
  disabled,
}: {
  columnKey: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground font-medium -ml-1 px-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSort(columnKey)}
        disabled={disabled}
      >
        {children}
        {sortKey === columnKey ? (
          sortDir === 'asc' ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )
        ) : null}
      </button>
    </TableHead>
  );
}

function SearchableFilterDropdown({
  label,
  value,
  onChange,
  options: optionsProp,
  searchPlaceholder = 'Search…',
  anyLabel = 'Any',
  triggerClassName,
  allowCustom = true,
  emptyHint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SearchableFilterOption[];
  searchPlaceholder?: string;
  anyLabel?: string;
  triggerClassName?: string;
  allowCustom?: boolean;
  emptyHint?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const options = useMemo(() => normalizeFilterOptions(optionsProp), [optionsProp]);

  const displayValue = useMemo(() => {
    if (!value) return null;
    const found = options.find((o) => o.value === value);
    return found?.label ?? value;
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const searchTrim = search.trim();
  const canUseCustom =
    allowCustom && searchTrim.length > 0 && !options.some((o) => o.value === searchTrim);

  const defaultEmptyHint = allowCustom
    ? 'Load events to see values, or type and choose "Use …"'
    : 'No options';

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('justify-between font-normal', triggerClassName)}
          >
            <span className="truncate text-left">{displayValue ?? anyLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-80 max-w-[min(20rem,calc(100vw-2rem))] sm:min-w-[200px]"
          align="start"
        >
          <div className="border-b p-2">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canUseCustom) {
                  e.preventDefault();
                  onChange(searchTrim);
                  setOpen(false);
                  setSearch('');
                }
              }}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                !value && 'bg-muted/50'
              )}
              onClick={() => {
                onChange('');
                setOpen(false);
                setSearch('');
              }}
            >
              <Check className={cn('h-4 w-4 shrink-0', !value ? 'opacity-100' : 'opacity-0')} />
              {anyLabel}
            </button>
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                  value === opt.value && 'bg-muted/50'
                )}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    value === opt.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
            {canUseCustom && (
              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-accent"
                onClick={() => {
                  onChange(searchTrim);
                  setOpen(false);
                  setSearch('');
                }}
              >
                Use &quot;{searchTrim}&quot;
              </button>
            )}
            {filtered.length === 0 && !canUseCustom && options.length > 0 && (
              <p className="px-2 py-2 text-sm text-muted-foreground">No matches</p>
            )}
            {options.length === 0 && (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                {emptyHint ?? defaultEmptyHint}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

type FilterDraft = {
  dashboardWorkspaceId: string;
  category: string;
  action: string;
  from: string;
  to: string;
};

function pickDraft(s: EventsExplorerUrlState): FilterDraft {
  return {
    dashboardWorkspaceId: s.dashboardWorkspaceId,
    category: s.category,
    action: s.action,
    from: s.from,
    to: s.to,
  };
}

function Chip({
  label,
  onRemove,
  removable,
}: {
  label: string;
  onRemove?: () => void;
  removable: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 pl-2.5 pr-1 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {removable ? (
        <button
          type="button"
          className="rounded-full p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

export function EventsExplorerContent({
  companyRole,
  initialEvents,
  initialTotal,
  initialCategories,
  initialActions,
  initialError,
  workspaces,
  initialExplorerState,
  apiConfigured,
  exportHyrelogWorkspaceId,
  exportDisabled,
  exportDisabledReason,
  savedExplorerViews,
  currentUserId,
  elevatedSavedViewMutations,
}: {
  companyRole: CompanyRole;
  initialEvents: Event[];
  initialTotal: number;
  initialCategories: string[];
  initialActions: string[];
  initialError: string | null;
  workspaces: Workspace[];
  initialExplorerState: EventsExplorerUrlState;
  apiConfigured: boolean;
  /** Resolved HyreLog workspace id for export scope (null = company-wide for admins). */
  exportHyrelogWorkspaceId: string | null;
  exportDisabled: boolean;
  exportDisabledReason?: string | null;
  savedExplorerViews: SavedExplorerViewSummary[];
  currentUserId: string;
  elevatedSavedViewMutations: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [saveDialog, setSaveDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    view?: SavedExplorerViewSummary;
  }>({ open: false, mode: 'create' });

  const explorerState = initialExplorerState;
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(() => pickDraft(initialExplorerState));
  const [filterCategories, setFilterCategories] = useState<string[]>(initialCategories);
  const [filterActions, setFilterActions] = useState<string[]>(initialActions);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  useEffect(() => {
    setFilterDraft(pickDraft(initialExplorerState));
  }, [initialExplorerState]);

  useEffect(() => {
    setFilterCategories(initialCategories);
    setFilterActions(initialActions);
  }, [initialCategories, initialActions]);

  useEffect(() => {
    setDetailEvent(null);
  }, [initialExplorerState]);

  const permittedIds = useMemo(() => workspaces.map((w) => w.id), [workspaces]);
  const workspaceChipLocked = isWorkspaceChipLockedForRole(companyRole, workspaces.length);
  const showWorkspaceSelector = isCompanyLevelRole(companyRole) || workspaces.length > 1;

  const navigateExplorer = (next: EventsExplorerUrlState) => {
    startTransition(() => {
      router.replace(explorerPathWithQuery(next));
    });
  };

  const workspaceNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of workspaces) m.set(w.id, w.name);
    return m;
  }, [workspaces]);

  const scopedWorkspaceName =
    explorerState.dashboardWorkspaceId && workspaceNameById.get(explorerState.dashboardWorkspaceId)
      ? workspaceNameById.get(explorerState.dashboardWorkspaceId) ?? null
      : null;

  const applyDraft = () => {
    navigateExplorer({
      ...explorerState,
      ...filterDraft,
      page: 1,
      savedExplorerViewId: '',
    });
  };

  const handleSort = (key: SortKey) => {
    const newOrder: SortDir =
      explorerState.sort === key
        ? explorerState.order === 'asc'
          ? 'desc'
          : 'asc'
        : key === 'timestamp'
          ? 'desc'
          : 'asc';
    navigateExplorer({
      ...explorerState,
      sort: key,
      order: newOrder,
      page: 1,
    });
  };

  const goToPage = (p: number) => {
    navigateExplorer({ ...explorerState, page: p });
  };

  const setPageSize = (ps: PageSize) => {
    navigateExplorer({ ...explorerState, pageSize: ps, page: 1 });
  };

  const removeChip = (chip: Parameters<typeof chipRemovalStateUpdate>[0]) => {
    const delta = chipRemovalStateUpdate(chip, explorerState, { workspaceChipLocked });
    if (Object.keys(delta).length === 0) return;
    navigateExplorer({ ...explorerState, ...delta });
  };

  const resetFilters = () => {
    const reset = buildResetExplorerFilters(companyRole, permittedIds, explorerState.dashboardWorkspaceId);
    navigateExplorer({
      ...explorerState,
      ...reset,
      pageSize: explorerState.pageSize,
      ref: explorerState.ref,
    });
  };

  const refreshFilterOptions = () => {
    startTransition(async () => {
      const optRes = await getEventsFilterOptionsAction({
        from: explorerState.from || undefined,
        to: explorerState.to || undefined,
        dashboardWorkspaceId: explorerState.dashboardWorkspaceId || null,
      });
      if (optRes.ok) {
        setFilterCategories(optRes.categories);
        setFilterActions(optRes.actions);
      }
    });
  };

  const pageSize = explorerState.pageSize as PageSize;
  const pageCount = useMemo(
    () => (initialTotal > 0 ? Math.max(1, Math.ceil(initialTotal / pageSize)) : 1),
    [initialTotal, pageSize]
  );
  const effectivePage = Math.min(explorerState.page, pageCount);
  const startItem = initialTotal > 0 ? (effectivePage - 1) * pageSize + 1 : 0;
  const endItem = initialTotal > 0 ? Math.min(effectivePage * pageSize, initialTotal) : 0;

  const rangeLabel = useMemo(() => {
    if (explorerState.from && explorerState.to) {
      return `${formatExplorerChipDate(explorerState.from)} → ${formatExplorerChipDate(explorerState.to)}`;
    }
    if (explorerState.from) return `From ${formatExplorerChipDate(explorerState.from)}`;
    if (explorerState.to) return `To ${formatExplorerChipDate(explorerState.to)}`;
    return 'Any time';
  }, [explorerState.from, explorerState.to]);

  const openRow = (ev: Event) => setDetailEvent(ev);

  if (!apiConfigured) {
    return (
      <div className="p-4 sm:p-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-muted-foreground">
            Configure HYRELOG_API_URL and DASHBOARD_SERVICE_TOKEN to view events from the API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Event explorer</h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Investigate audit events with scoped filters. URLs are shareable; workspace access is enforced on the
                server.
              </p>
              <p className="text-xs text-muted-foreground mt-2">{rangeLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {explorerState.ref === 'dashboard' ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/">Back to dashboard</Link>
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={resetFilters} disabled={isPending}>
                Reset filters
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exportDisabled}
                title={
                  exportDisabled
                    ? (exportDisabledReason ?? 'Export unavailable')
                    : 'Queue a streaming export using the current filters'
                }
                onClick={() => setExportDialogOpen(true)}
              >
                Export filtered events
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/exports">Streaming exports</Link>
              </Button>
              <SavedExplorerViewsMenu
                companyRole={companyRole}
                currentUserId={currentUserId}
                elevatedMutations={elevatedSavedViewMutations}
                views={savedExplorerViews}
                workspaces={workspaces}
                explorerState={explorerState}
                disabled={isPending}
                onOpenSaveDialog={() => setSaveDialog({ open: true, mode: 'create' })}
                onOpenEditDialog={(v) => setSaveDialog({ open: true, mode: 'edit', view: v })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setSaveDialog({ open: true, mode: 'create' })}
              >
                Save view
              </Button>
            </div>
          </div>

          {(explorerState.dashboardWorkspaceId || explorerState.category || explorerState.action || explorerState.from || explorerState.to) && (
            <div className="flex min-w-0 flex-wrap gap-2 items-center">
              {explorerState.dashboardWorkspaceId ? (
                <Chip
                  label={`Workspace: ${scopedWorkspaceName ?? explorerState.dashboardWorkspaceId}`}
                  removable={!workspaceChipLocked}
                  onRemove={workspaceChipLocked ? undefined : () => removeChip('workspace')}
                />
              ) : null}
              {explorerState.category ? (
                <Chip
                  label={`Category: ${explorerState.category}`}
                  removable
                  onRemove={() => removeChip('category')}
                />
              ) : null}
              {explorerState.action ? (
                <Chip label={`Action: ${explorerState.action}`} removable onRemove={() => removeChip('action')} />
              ) : null}
              {explorerState.from ? (
                <Chip
                  label={`From: ${formatExplorerChipDate(explorerState.from)}`}
                  removable
                  onRemove={() => removeChip('from')}
                />
              ) : null}
              {explorerState.to ? (
                <Chip
                  label={`To: ${formatExplorerChipDate(explorerState.to)}`}
                  removable
                  onRemove={() => removeChip('to')}
                />
              ) : null}
            </div>
          )}

          <div className="-mx-4 flex min-w-0 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-x-visible sm:px-0">
            {showWorkspaceSelector ? (
              <SearchableFilterDropdown
                label="Workspace"
                value={filterDraft.dashboardWorkspaceId}
                onChange={(v) => setFilterDraft((f) => ({ ...f, dashboardWorkspaceId: v }))}
                options={workspaces
                  .filter((w): w is Workspace & { id: string } => Boolean(w.id))
                  .map((w) => ({ value: w.id, label: w.name }))}
                searchPlaceholder="Search workspaces…"
                anyLabel={isCompanyLevelRole(companyRole) ? 'All workspaces' : 'Select workspace'}
                allowCustom={false}
                emptyHint="No accessible workspaces"
                triggerClassName="w-full min-w-[200px]"
                disabled={isPending}
              />
            ) : null}
            <SearchableFilterDropdown
              label="Category"
              value={filterDraft.category}
              onChange={(v) => setFilterDraft((f) => ({ ...f, category: v }))}
              options={filterCategories}
              searchPlaceholder="Search categories…"
              emptyHint="No categories in this scope (adjust workspace or date range)"
              triggerClassName="w-full min-w-[200px]"
              disabled={isPending}
            />
            <SearchableFilterDropdown
              label="Action"
              value={filterDraft.action}
              onChange={(v) => setFilterDraft((f) => ({ ...f, action: v }))}
              options={filterActions}
              searchPlaceholder="Search actions…"
              emptyHint="No actions in this scope (adjust workspace or date range)"
              triggerClassName="w-full min-w-[200px]"
              disabled={isPending}
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <input
                type="datetime-local"
                disabled={isPending}
                className="rounded border border-input bg-background px-3 py-2 text-sm h-9"
                value={
                  filterDraft.from
                    ? (() => {
                        const d = new Date(filterDraft.from);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                          d.getDate()
                        ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(
                          d.getMinutes()
                        ).padStart(2, '0')}`;
                      })()
                    : ''
                }
                onChange={(e) =>
                  setFilterDraft((f) => ({
                    ...f,
                    from: e.target.value ? new Date(e.target.value).toISOString() : '',
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <input
                type="datetime-local"
                disabled={isPending}
                className="rounded border border-input bg-background px-3 py-2 text-sm h-9"
                value={
                  filterDraft.to
                    ? (() => {
                        const d = new Date(filterDraft.to);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                          d.getDate()
                        ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(
                          d.getMinutes()
                        ).padStart(2, '0')}`;
                      })()
                    : ''
                }
                onChange={(e) =>
                  setFilterDraft((f) => ({
                    ...f,
                    to: e.target.value ? new Date(e.target.value).toISOString() : '',
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[120px]">
              <Label className="text-xs text-muted-foreground">Sort</Label>
              <Select
                value={`${explorerState.sort}:${explorerState.order}`}
                onValueChange={(v) => {
                  const [sort, order] = v.split(':') as [SortKey, SortDir];
                  navigateExplorer({ ...explorerState, sort, order, page: 1 });
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp:desc">Time (newest)</SelectItem>
                  <SelectItem value="timestamp:asc">Time (oldest)</SelectItem>
                  <SelectItem value="category:asc">Category (A–Z)</SelectItem>
                  <SelectItem value="category:desc">Category (Z–A)</SelectItem>
                  <SelectItem value="action:asc">Action (A–Z)</SelectItem>
                  <SelectItem value="action:desc">Action (Z–A)</SelectItem>
                  <SelectItem value="id:desc">ID (desc)</SelectItem>
                  <SelectItem value="id:asc">ID (asc)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[100px]">
              <Label className="text-xs text-muted-foreground">Page size</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  if (v === '10' || v === '20' || v === '50' || v === '100' || v === '200') {
                    setPageSize(Number(v) as PageSize);
                  }
                }}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end">
              <Button type="button" onClick={applyDraft} disabled={isPending} className="shrink-0">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Apply filters
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={refreshFilterOptions} disabled={isPending}>
                Refresh options
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-[1600px] mx-auto w-full space-y-6">
        {initialError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {initialError}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  Select a row to inspect metadata and request context. Integrity fields appear when present on the
                  event payload.
                </CardDescription>
              </div>
              <p className="text-sm text-muted-foreground">
                {initialTotal === 0
                  ? '0 events'
                  : `${initialTotal.toLocaleString()} event${initialTotal === 1 ? '' : 's'} total`}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <div className={cn('relative min-w-0', isPending && 'opacity-60 pointer-events-none')}>
              {isPending ? (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/40">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : null}
              <Table className="w-max min-w-full table-auto">
                <TableHeader>
                  <TableRow>
                    <EventSortHeader
                      columnKey="timestamp"
                      sortKey={explorerState.sort}
                      sortDir={explorerState.order}
                      onSort={handleSort}
                      disabled={isPending}
                      className="min-w-[160px]"
                    >
                      Time
                    </EventSortHeader>
                    <EventSortHeader
                      columnKey="action"
                      sortKey={explorerState.sort}
                      sortDir={explorerState.order}
                      onSort={handleSort}
                      disabled={isPending}
                    >
                      Action
                    </EventSortHeader>
                    <EventSortHeader
                      columnKey="category"
                      sortKey={explorerState.sort}
                      sortDir={explorerState.order}
                      onSort={handleSort}
                      disabled={isPending}
                    >
                      Category
                    </EventSortHeader>
                    <TableHead className="min-w-[140px]">Actor</TableHead>
                    <TableHead className="min-w-[160px]">Resource</TableHead>
                    <TableHead className="min-w-[120px]">Workspace</TableHead>
                    <TableHead className="min-w-[100px]">Project</TableHead>
                    <TableHead className="min-w-[100px]">Integrity</TableHead>
                    <EventSortHeader
                      columnKey="id"
                      sortKey={explorerState.sort}
                      sortDir={explorerState.order}
                      onSort={handleSort}
                      disabled={isPending}
                      className="font-mono text-xs w-auto whitespace-nowrap"
                    >
                      ID
                    </EventSortHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialEvents.map((ev) => {
                    const integ = extractIntegrityHints(ev.metadata);
                    const integLabel = formatIntegrityBadge(integ);
                    const rowCtx = extractExplorerRowContext(ev.metadata);
                    const wsCell = rowCtx.workspace ?? scopedWorkspaceName ?? '—';
                    const projCell = rowCtx.project ?? '—';
                    return (
                      <TableRow
                        key={ev.id}
                        tabIndex={0}
                        className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => openRow(ev)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openRow(ev);
                          }
                        }}
                      >
                        <TableCell className="text-sm whitespace-nowrap">{formatEventTime(ev.timestamp)}</TableCell>
                        <TableCell className="text-sm">
                          <span className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs">{ev.action}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="rounded-md border px-2 py-0.5 text-xs capitalize">{ev.category}</span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{formatActorCell(ev)}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[220px] truncate">
                          {formatResourceCell(ev)}
                        </TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate" title={wsCell}>
                          {wsCell}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate" title={projCell}>
                          {projCell}
                        </TableCell>
                        <TableCell className="text-sm">
                          {integLabel ? (
                            <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs">{integLabel}</span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap" title={ev.id}>
                          {formatEventIdShort(ev.id)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </div>

            {initialTotal === 0 && !isPending && !initialError ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-sm font-medium">No events match these filters</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Broaden the time range, clear category or action, or pick another workspace. If you expect data,
                  confirm ingestion is healthy for this scope.
                </p>
              </div>
            ) : null}

            {initialTotal > 0 && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of{' '}
                    {initialTotal.toLocaleString()}
                  </span>
                </div>
                {pageCount > 1 &&
                  (() => {
                    const WINDOW = 4;
                    let startP = Math.max(1, effectivePage - Math.floor(WINDOW / 2));
                    let endP = Math.min(pageCount, startP + WINDOW - 1);
                    if (endP - startP + 1 < WINDOW) {
                      startP = Math.max(1, endP - WINDOW + 1);
                    }
                    const pageNumbers = Array.from({ length: endP - startP + 1 }, (_, i) => startP + i);
                    return (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => goToPage(1)}
                          disabled={isPending || effectivePage <= 1}
                          title="First page"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                          <span className="sr-only">First page</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => goToPage(effectivePage - 1)}
                          disabled={isPending || effectivePage <= 1}
                          title="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Previous page</span>
                        </Button>
                        <div className="flex items-center gap-1 px-1">
                          {pageNumbers.map((num) => (
                            <Button
                              key={num}
                              variant={effectivePage === num ? 'default' : 'outline'}
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => goToPage(num)}
                              disabled={isPending}
                            >
                              {num}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => goToPage(effectivePage + 1)}
                          disabled={isPending || effectivePage >= pageCount}
                          title="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Next page</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => goToPage(pageCount)}
                          disabled={isPending || effectivePage >= pageCount}
                          title="Last page"
                        >
                          <ChevronsRight className="h-4 w-4" />
                          <span className="sr-only">Last page</span>
                        </Button>
                      </div>
                    );
                  })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ExportFilteredEventsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        explorerState={explorerState}
        workspaceLabel={scopedWorkspaceName}
        hyrelogWorkspaceId={exportHyrelogWorkspaceId}
        companyRole={companyRole}
        exportDisabled={exportDisabled}
        exportDisabledReason={exportDisabledReason ?? null}
        savedExplorerViewId={explorerState.savedExplorerViewId || null}
      />
      <SaveExplorerViewDialog
        open={saveDialog.open}
        onOpenChange={(open) => setSaveDialog((d) => ({ ...d, open }))}
        mode={saveDialog.mode}
        viewId={saveDialog.view?.id}
        initialName={saveDialog.view?.name ?? ''}
        initialDescription={saveDialog.view?.description ?? ''}
        initialWorkspaceDashboardId={
          saveDialog.mode === 'edit' && saveDialog.view?.workspaceId
            ? workspaces.find((w) => w.apiWorkspaceId === saveDialog.view?.workspaceId)?.id ?? ''
            : explorerState.dashboardWorkspaceId
        }
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
        companyRole={companyRole}
        explorerState={explorerState}
        onSaved={() => router.refresh()}
      />
      <EventDetailDrawer
        open={!!detailEvent}
        onOpenChange={(o) => !o && setDetailEvent(null)}
        event={detailEvent}
        workspaceLabel={
          scopedWorkspaceName ?? (detailEvent ? extractExplorerRowContext(detailEvent.metadata).workspace : null) ?? null
        }
        projectLabel={detailEvent ? extractExplorerRowContext(detailEvent.metadata).project ?? null : null}
      />
    </div>
  );
}
