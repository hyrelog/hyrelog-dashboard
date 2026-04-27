'use client';

import { useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getEventsAction, getEventsFilterOptionsAction } from '@/actions/events';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Check,
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

type Event = {
  id: string;
  timestamp: string;
  category: string;
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata: unknown;
  traceId?: string | null;
  ipAddress?: string | null;
  geo?: string | null;
  userAgent?: string | null;
};

type Workspace = { id: string; name: string };

type SearchableFilterOption = string | { value: string; label: string };

function normalizeFilterOptions(options: SearchableFilterOption[]): { value: string; label: string }[] {
  if (options.length === 0) return [];
  if (typeof options[0] === 'string') {
    return (options as string[]).map((o) => ({ value: o, label: o }));
  }
  return options as { value: string; label: string }[];
}

/**
 * Deterministic across Node and browser. `toLocaleString()` defaults differ and cause hydration mismatches.
 */
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
        className="flex items-center gap-1 hover:text-foreground font-medium -ml-1 px-1 rounded-md"
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

type FilterState = {
  workspaceId: string;
  category: string;
  action: string;
  from: string;
  to: string;
};

function buildListQuery(filters: FilterState) {
  return {
    ...(filters.workspaceId && { workspaceId: filters.workspaceId }),
    ...(filters.category && { category: filters.category }),
    ...(filters.action && { action: filters.action }),
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
  };
}

export function EventsExplorerContent({
  initialEvents,
  initialTotal,
  initialCategories,
  initialActions,
  initialError,
  workspaces,
  apiConfigured,
}: {
  initialEvents: Event[];
  initialTotal: number;
  initialCategories: string[];
  initialActions: string[];
  initialError: string | null;
  workspaces: Workspace[];
  apiConfigured: boolean;
}) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [total, setTotal] = useState(initialTotal);
  const [filterCategories, setFilterCategories] = useState<string[]>(initialCategories);
  const [filterActions, setFilterActions] = useState<string[]>(initialActions);
  const [error, setError] = useState<string | null>(initialError);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filters, setFilters] = useState<FilterState>({
    workspaceId: '',
    category: '',
    action: '',
    from: '',
    to: '',
  });

  const pageCount = useMemo(
    () => (total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1),
    [total, pageSize]
  );
  const effectivePage = Math.min(page, pageCount);
  const startItem = total > 0 ? (effectivePage - 1) * pageSize + 1 : 0;
  const endItem = total > 0 ? Math.min(effectivePage * pageSize, total) : 0;

  const fetchList = (args: {
    page: number;
    ps: number;
    sk: SortKey;
    sd: SortDir;
    f: FilterState;
  }) => {
    startTransition(async () => {
      const q = buildListQuery(args.f);
      let pageNum = args.page;
      const ps = args.ps;
      const result = await getEventsAction({
        limit: ps,
        offset: (pageNum - 1) * ps,
        sort: args.sk,
        order: args.sd,
        ...q,
      });
      if (!result.ok) {
        setError(result.error ?? 'Failed to load');
        return;
      }
      let rows = result.events;
      let totalRows = result.total;
      if (totalRows > 0) {
        const lastPage = Math.max(1, Math.ceil(totalRows / ps));
        if (pageNum > lastPage) {
          pageNum = lastPage;
          const r2 = await getEventsAction({
            limit: ps,
            offset: (lastPage - 1) * ps,
            sort: args.sk,
            order: args.sd,
            ...q,
          });
          if (r2.ok) {
            rows = r2.events;
            totalRows = r2.total;
          }
        }
      }
      setEvents(rows);
      setTotal(totalRows);
      setPage(pageNum);
      setPageSize(ps);
      setSortKey(args.sk);
      setSortDir(args.sd);
      setError(null);
    });
  };

  const applyFilters = () => {
    startTransition(async () => {
      const q = buildListQuery(filters);
      const [evRes, optRes] = await Promise.all([
        getEventsAction({
          limit: pageSize,
          offset: 0,
          sort: sortKey,
          order: sortDir,
          ...q,
        }),
        getEventsFilterOptionsAction({
          from: filters.from || undefined,
          to: filters.to || undefined,
          workspaceId: filters.workspaceId || undefined,
        }),
      ]);
      if (evRes.ok) {
        setEvents(evRes.events);
        setTotal(evRes.total);
        setPage(1);
        setError(null);
      } else {
        setError(evRes.error ?? 'Failed to load');
      }
      if (optRes.ok) {
        setFilterCategories(optRes.categories);
        setFilterActions(optRes.actions);
      }
    });
  };

  const handleSort = (key: SortKey) => {
    const newOrder: SortDir =
      sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : key === 'timestamp' ? 'desc' : 'asc';
    fetchList({ page: 1, ps: pageSize, sk: key, sd: newOrder, f: filters });
  };

  const goToPage = (p: number) => {
    fetchList({ page: p, ps: pageSize, sk: sortKey, sd: sortDir, f: filters });
  };

  const copyJson = (event: Event) => {
    const str = JSON.stringify(event, null, 2);
    void navigator.clipboard.writeText(str);
  };

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
    <div className="p-4 sm:p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Events explorer</h1>
          <p className="text-muted-foreground">
            View and filter audit events ingested via the API. Counts and paging are from the server.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter by workspace, category, action, or date range.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <SearchableFilterDropdown
              label="Workspace"
              value={filters.workspaceId}
              onChange={(v) => setFilters((f) => ({ ...f, workspaceId: v }))}
              options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
              searchPlaceholder="Search workspaces…"
              anyLabel="All workspaces"
              allowCustom={false}
              emptyHint="No workspaces in this company"
              triggerClassName="w-full min-w-[200px]"
            />
            <SearchableFilterDropdown
              label="Category"
              value={filters.category}
              onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
              options={filterCategories}
              searchPlaceholder="Search categories…"
              emptyHint="No categories in this scope (adjust workspace or date range)"
              triggerClassName="w-full min-w-[200px]"
            />
            <SearchableFilterDropdown
              label="Action"
              value={filters.action}
              onChange={(v) => setFilters((f) => ({ ...f, action: v }))}
              options={filterActions}
              searchPlaceholder="Search actions…"
              emptyHint="No actions in this scope (adjust workspace or date range)"
              triggerClassName="w-full min-w-[200px]"
            />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <input
                type="datetime-local"
                className="rounded border border-input bg-background px-3 py-2 text-sm h-9"
                value={
                  filters.from
                    ? (() => {
                        const d = new Date(filters.from);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                          d.getDate()
                        ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(
                          d.getMinutes()
                        ).padStart(2, '0')}`;
                      })()
                    : ''
                }
                onChange={(e) =>
                  setFilters((f) => ({
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
                className="rounded border border-input bg-background px-3 py-2 text-sm h-9"
                value={
                  filters.to
                    ? (() => {
                        const d = new Date(filters.to);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                          d.getDate()
                        ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(
                          d.getMinutes()
                        ).padStart(2, '0')}`;
                      })()
                    : ''
                }
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    to: e.target.value ? new Date(e.target.value).toISOString() : '',
                  }))
                }
              />
            </div>
            <Button onClick={applyFilters} disabled={isPending} className="shrink-0">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apply
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <CardTitle>Events</CardTitle>
                <CardDescription>
                  Click a row to view details. Sorting and paging use the API (up to 200 rows per request).
                </CardDescription>
              </div>
              <p className="text-sm text-muted-foreground">
                {total === 0 ? '0 events' : `${total.toLocaleString()} event${total === 1 ? '' : 's'} total`}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table className="w-max min-w-full table-auto">
                <TableHeader>
                  <TableRow>
                    <EventSortHeader
                      columnKey="id"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      disabled={isPending}
                      className="font-mono text-xs w-auto whitespace-nowrap"
                    >
                      ID
                    </EventSortHeader>
                    <EventSortHeader
                      columnKey="timestamp"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      disabled={isPending}
                      className="min-w-[160px]"
                    >
                      Time
                    </EventSortHeader>
                    <EventSortHeader
                      columnKey="category"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      disabled={isPending}
                    >
                      Category
                    </EventSortHeader>
                    <EventSortHeader
                      columnKey="action"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      disabled={isPending}
                    >
                      Action
                    </EventSortHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow
                      key={ev.id}
                      className="cursor-pointer"
                      onClick={() => setDetailEvent(ev)}
                    >
                      <TableCell className="max-w-none font-mono text-xs align-top pr-3 whitespace-nowrap">
                        {ev.id}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatEventTime(ev.timestamp)}
                      </TableCell>
                      <TableCell className="text-sm">{ev.category}</TableCell>
                      <TableCell className="text-sm">{ev.action}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {total === 0 && !isPending && (
              <p className="text-sm text-muted-foreground py-4">No events found.</p>
            )}

            {total > 0 && (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of{' '}
                    {total.toLocaleString()}
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      if (v === '10' || v === '20' || v === '50' || v === '100' || v === '200') {
                        const ps = Number(v) as PageSize;
                        fetchList({ page: 1, ps, sk: sortKey, sd: sortDir, f: filters });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full min-w-[80px] sm:w-[100px]">
                      <SelectValue placeholder="Per page" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((opt) => (
                        <SelectItem key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
                {pageCount > 1 &&
                  (() => {
                    const WINDOW = 4;
                    let startP = Math.max(1, effectivePage - Math.floor(WINDOW / 2));
                    let endP = Math.min(pageCount, startP + WINDOW - 1);
                    if (endP - startP + 1 < WINDOW) {
                      startP = Math.max(1, endP - WINDOW + 1);
                    }
                    const pageNumbers = Array.from(
                      { length: endP - startP + 1 },
                      (_, i) => startP + i
                    );
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

        <Dialog open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Event details</DialogTitle>
            </DialogHeader>
            {detailEvent && (
              <div className="space-y-2">
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(detailEvent, null, 2)}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyJson(detailEvent)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy JSON
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
