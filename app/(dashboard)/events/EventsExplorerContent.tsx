'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getEventsAction } from '@/actions/events';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Loader2 } from 'lucide-react';

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

export function EventsExplorerContent({
  initialEvents,
  initialNextCursor,
  initialError,
  workspaces,
  apiConfigured,
}: {
  initialEvents: Event[];
  initialNextCursor: string | null;
  initialError: string | null;
  workspaces: Workspace[];
  apiConfigured: boolean;
}) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [error, setError] = useState<string | null>(initialError);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState({
    workspaceId: '',
    category: '',
    action: '',
    from: '',
    to: '',
  });

  const loadMore = () => {
    if (!nextCursor || loading) return;
    setLoading(true);
    startTransition(async () => {
      const result = await getEventsAction({
        limit: 20,
        cursor: nextCursor,
        ...(filters.workspaceId && { workspaceId: filters.workspaceId }),
        ...(filters.category && { category: filters.category }),
        ...(filters.action && { action: filters.action }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      });
      setLoading(false);
      if (result.ok) {
        setEvents((prev) => [...prev, ...result.events]);
        setNextCursor(result.nextCursor);
      } else {
        setError(result.error ?? 'Failed to load');
      }
    });
  };

  const applyFilters = () => {
    startTransition(async () => {
      const result = await getEventsAction({
        limit: 20,
        ...(filters.workspaceId && { workspaceId: filters.workspaceId }),
        ...(filters.category && { category: filters.category }),
        ...(filters.action && { action: filters.action }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to }),
      });
      if (result.ok) {
        setEvents(result.events);
        setNextCursor(result.nextCursor);
        setError(null);
      } else {
        setError(result.error ?? 'Failed to load');
      }
    });
  };

  const copyJson = (event: Event) => {
    const str = JSON.stringify(event, null, 2);
    void navigator.clipboard.writeText(str);
  };

  if (!apiConfigured) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Events</h1>
        <p className="text-muted-foreground">
          Configure HYRELOG_API_URL and DASHBOARD_SERVICE_TOKEN to view events from the API.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Events explorer</h1>
        <p className="text-muted-foreground">
          View and filter audit events ingested via the API.
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
        <CardContent className="flex flex-wrap gap-3">
          <select
            className="rounded border bg-background px-3 py-2 text-sm"
            value={filters.workspaceId}
            onChange={(e) => setFilters((f) => ({ ...f, workspaceId: e.target.value }))}
          >
            <option value="">All workspaces</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Category"
            className="rounded border bg-background px-3 py-2 text-sm w-32"
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Action"
            className="rounded border bg-background px-3 py-2 text-sm w-32"
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="rounded border bg-background px-3 py-2 text-sm"
            value={filters.from ? (() => {
              const d = new Date(filters.from);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            })() : ''}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
          />
          <input
            type="datetime-local"
            className="rounded border bg-background px-3 py-2 text-sm"
            value={filters.to ? (() => {
              const d = new Date(filters.to);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            })() : ''}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
          />
          <Button onClick={applyFilters} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>Click an event to view details and copy JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2"
                onClick={() => setDetailEvent(ev)}
              >
                <span className="text-sm font-mono truncate">{ev.id}</span>
                <span className="text-sm text-muted-foreground shrink-0">
                  {new Date(ev.timestamp).toLocaleString()} | {ev.category} / {ev.action}
                </span>
              </li>
            ))}
          </ul>
          {events.length === 0 && !isPending && (
            <p className="text-sm text-muted-foreground py-4">No events found.</p>
          )}
          {nextCursor && (
            <Button variant="outline" className="mt-4" onClick={loadMore} disabled={loading || isPending}>
              {loading || isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Load more
            </Button>
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
  );
}
