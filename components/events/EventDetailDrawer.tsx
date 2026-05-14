'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, X } from 'lucide-react';
import type { DrawerEventDetail } from '@/lib/events/event-detail-format';
import { formatJsonPretty, sanitizeEventJsonForDisplay } from '@/lib/events/event-detail-format';
import {
  formatActorCell,
  formatResourceCell,
  extractIntegrityHints,
  formatIntegrityBadge
} from '@/lib/events/event-row-format';
import { cn } from '@/lib/utils';

type EventDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: DrawerEventDetail | null;
  /** When list is scoped to one dashboard workspace, show its display name. */
  workspaceLabel: string | null;
  /** Project column is not returned by the dashboard events API today. */
  projectLabel?: string | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm wrap-break-word">{children}</div>
    </div>
  );
}

function BadgeLike({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      {children}
    </span>
  );
}

export function EventDetailDrawer({
  open,
  onOpenChange,
  event,
  workspaceLabel,
  projectLabel
}: EventDetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open || !event) return null;

  const integrity = extractIntegrityHints(event.metadata);
  const integrityLabel = formatIntegrityBadge(integrity);
  const safePayload = sanitizeEventJsonForDisplay({
    id: event.id,
    timestamp: event.timestamp,
    category: event.category,
    action: event.action,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    actorRole: event.actorRole,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    metadata: event.metadata,
    traceId: event.traceId,
    ipAddress: event.ipAddress,
    geo: event.geo,
    userAgent: event.userAgent
  });

  const copyId = () => {
    void navigator.clipboard.writeText(event.id);
  };

  const copyJson = () => {
    void navigator.clipboard.writeText(formatJsonPretty(safePayload));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-drawer-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={() => onOpenChange(false)}
      />
      <aside className="relative flex h-full max-h-dvh w-full max-w-full flex-col overflow-y-auto border-l bg-background shadow-xl animate-in slide-in-from-right duration-200 sm:max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2
              id="event-drawer-title"
              className="text-lg font-semibold leading-tight"
            >
              Event details
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {/* TODO: add GET /dashboard/events/:id when HyreLog exposes a stable detail endpoint for deep inspection. */}
              Row snapshot from the list API (no separate detail fetch).
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyId}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy event ID
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyJson}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy JSON
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Timestamp">{event.timestamp}</Field>
            <Field label="Action">
              <BadgeLike>{event.action}</BadgeLike>
            </Field>
            <Field label="Category">
              <BadgeLike className="capitalize">{event.category}</BadgeLike>
            </Field>
            <Field label="Actor">{formatActorCell(event)}</Field>
            <Field label="Resource">{formatResourceCell(event)}</Field>
            <Field label="Workspace">{workspaceLabel?.trim() || '—'}</Field>
            <Field label="Project">{projectLabel?.trim() || '—'}</Field>
          </div>

          {integrityLabel || integrity ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Integrity</p>
              {integrityLabel ? <BadgeLike>{integrityLabel}</BadgeLike> : null}
              <div className="grid gap-2 text-xs font-mono break-all">
                {integrity?.hash ? <div>hash: {integrity.hash}</div> : null}
                {integrity?.prevHash ? <div>prevHash: {integrity.prevHash}</div> : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Request context</p>
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2 font-mono break-all">
              <div>ip: {event.ipAddress ?? '—'}</div>
              <div>geo: {event.geo ?? '—'}</div>
              <div className="whitespace-pre-wrap">userAgent: {event.userAgent ?? '—'}</div>
              <div>traceId: {event.traceId ?? '—'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Metadata (JSON)</p>
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-56 whitespace-pre-wrap">
              {formatJsonPretty(sanitizeEventJsonForDisplay(event.metadata))}
            </pre>
          </div>
        </div>
      </aside>
    </div>
  );
}
