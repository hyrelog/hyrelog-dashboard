'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createWebhookAction, getWebhookDeliveriesAction, setWebhookStatusAction } from '@/actions/webhooks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Webhook = {
  id: string;
  url: string;
  status: string;
  events: string[];
  workspaceId: string;
  projectId?: string | null;
  createdAt: string;
};

type Delivery = {
  id: string;
  eventId: string;
  attempt: number;
  status: string;
  responseStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
  createdAt: string;
};

type WorkspaceOption = {
  id: string;
  name: string;
  apiWorkspaceId: string;
  status: string;
};

type WebhookProjectOption = {
  apiProjectId: string;
  name: string;
  slug: string;
  workspaceName: string;
  apiWorkspaceId: string;
};

export function WebhooksContent({
  webhooks,
  workspaces,
  projects,
  error,
  apiConfigured,
}: {
  webhooks: Webhook[];
  workspaces: WorkspaceOption[];
  projects: WebhookProjectOption[];
  error: string | null;
  apiConfigured: boolean;
}) {
  const [activeWebhookId, setActiveWebhookId] = useState<string | null>(null);
  const [deliveriesByWebhook, setDeliveriesByWebhook] = useState<Record<string, Delivery[]>>({});
  const [deliveriesErrorByWebhook, setDeliveriesErrorByWebhook] = useState<Record<string, string | null>>({});
  const [webhookMessage, setWebhookMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookWorkspaceId, setNewWebhookWorkspaceId] = useState(workspaces[0]?.apiWorkspaceId ?? '');
  const [newWebhookProjectId, setNewWebhookProjectId] = useState('');
  const [eventsText, setEventsText] = useState('AUDIT_EVENT_CREATED');
  const [lastCreatedSecret, setLastCreatedSecret] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const projectsForWorkspace = projects.filter((p) => p.apiWorkspaceId === newWebhookWorkspaceId);

  useEffect(() => {
    if (!newWebhookProjectId) return;
    const stillValid = projects.some(
      (p) => p.apiWorkspaceId === newWebhookWorkspaceId && p.apiProjectId === newWebhookProjectId
    );
    if (!stillValid) setNewWebhookProjectId('');
  }, [newWebhookWorkspaceId, newWebhookProjectId, projects]);

  const fmtDate = (iso: string) =>
    `${new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(new Date(iso))} UTC`;

  const loadDeliveries = (webhookId: string) => {
    setActiveWebhookId((prev) => (prev === webhookId ? null : webhookId));
    if (deliveriesByWebhook[webhookId]) return;
    startTransition(async () => {
      const res = await getWebhookDeliveriesAction(webhookId, 20);
      if (!res.ok) {
        setDeliveriesErrorByWebhook((prev) => ({ ...prev, [webhookId]: res.error }));
        return;
      }
      setDeliveriesByWebhook((prev) => ({ ...prev, [webhookId]: res.deliveries }));
      setDeliveriesErrorByWebhook((prev) => ({ ...prev, [webhookId]: null }));
    });
  };

  const handleCreateWebhook = () => {
    startTransition(async () => {
      setWebhookMessage(null);
      setLastCreatedSecret(null);
      const res = await createWebhookAction({
        workspaceId: newWebhookWorkspaceId,
        url: newWebhookUrl,
        projectId: newWebhookProjectId,
        eventsText,
      });
      if (!res.ok) {
        setWebhookMessage({ type: 'error', text: res.error });
        return;
      }
      setWebhookMessage({
        type: 'success',
        text: 'Webhook created and set to ACTIVE. Copy the signing secret below — it is not shown again.',
      });
      if (res.secret) setLastCreatedSecret(res.secret);
      setNewWebhookUrl('');
      setNewWebhookProjectId('');
      setEventsText('AUDIT_EVENT_CREATED');
    });
  };

  const handleSetStatus = (webhookId: string, status: 'ACTIVE' | 'DISABLED') => {
    startTransition(async () => {
      setWebhookMessage(null);
      const res = await setWebhookStatusAction(webhookId, status);
      if (!res.ok) {
        setWebhookMessage({ type: 'error', text: res.error });
        return;
      }
      setWebhookMessage({ type: 'success', text: status === 'ACTIVE' ? 'Webhook enabled.' : 'Webhook disabled.' });
    });
  };

  if (!apiConfigured) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-muted-foreground">
          Configure HYRELOG_API_URL and DASHBOARD_SERVICE_TOKEN to view webhooks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-muted-foreground">
          Webhook endpoints receive event notifications. Create and manage them via the API (company key required).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {webhookMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            webhookMessage.type === 'error'
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400'
          }`}
        >
          {webhookMessage.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create webhook</CardTitle>
          <CardDescription>
            Matches <span className="font-mono text-xs">POST /dashboard/webhooks</span>: URL, HyreLog workspace, optional
            project scope, and event subscriptions. The signing secret is generated by the API and shown once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastCreatedSecret && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm space-y-2">
              <p className="font-medium text-amber-900 dark:text-amber-100">Signing secret (copy now)</p>
              <code className="block break-all rounded bg-background/80 px-2 py-1.5 text-xs">{lastCreatedSecret}</code>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard.writeText(lastCreatedSecret);
                  }}
                >
                  Copy secret
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setLastCreatedSecret(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://example.com/webhooks/hyrelog"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                HTTPS required in production; <span className="font-mono">http://localhost</span> allowed locally.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="webhook-workspace">Workspace (HyreLog workspace id)</Label>
              <select
                id="webhook-workspace"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={newWebhookWorkspaceId}
                onChange={(e) => setNewWebhookWorkspaceId(e.target.value)}
                disabled={isPending || workspaces.length === 0}
              >
                {workspaces.map((w) => (
                  <option key={w.apiWorkspaceId} value={w.apiWorkspaceId}>
                    {w.name} ({w.apiWorkspaceId})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="webhook-project">Project scope (optional)</Label>
              <select
                id="webhook-project"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={newWebhookProjectId}
                onChange={(e) => setNewWebhookProjectId(e.target.value)}
                disabled={isPending || projectsForWorkspace.length === 0}
              >
                <option value="">Workspace-wide (all projects)</option>
                {projectsForWorkspace.map((p) => (
                  <option key={p.apiProjectId} value={p.apiProjectId}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
              {projectsForWorkspace.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No provisioned projects with an API id for this workspace — webhook applies to the whole workspace.
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-events">Events</Label>
            <Textarea
              id="webhook-events"
              className="min-h-[88px] font-mono text-sm"
              placeholder={'AUDIT_EVENT_CREATED\nOTHER_EVENT_WHEN_SUPPORTED'}
              value={eventsText}
              onChange={(e) => setEventsText(e.target.value)}
              disabled={isPending}
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              One event per line, or comma-separated. Duplicates are removed. Names must match the API (currently{' '}
              <span className="font-mono">AUDIT_EVENT_CREATED</span> only).
            </p>
          </div>
          <Button
            type="button"
            onClick={handleCreateWebhook}
            disabled={isPending || !newWebhookUrl.trim() || !newWebhookWorkspaceId || !eventsText.trim()}
          >
            {isPending ? 'Saving…' : 'Create webhook'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook endpoints</CardTitle>
          <CardDescription>List of webhooks for your company. Create with POST /v1/workspaces/:workspaceId/webhooks (company key).</CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks yet.</p>
          ) : (
            <ul className="divide-y">
              {webhooks.map((w) => (
                <li key={w.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{w.url}</p>
                      <p className="text-xs text-muted-foreground font-mono">{w.id}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-muted-foreground">{w.status}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetStatus(w.id, w.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')}
                      >
                        {w.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadDeliveries(w.id)}
                      >
                        {activeWebhookId === w.id ? 'Hide deliveries' : 'View deliveries'}
                      </Button>
                    </div>
                  </div>
                  {activeWebhookId === w.id && (
                    <div className="rounded-md border bg-muted/20 p-3">
                      {isPending && !deliveriesByWebhook[w.id] && (
                        <p className="text-sm text-muted-foreground">Loading deliveries…</p>
                      )}
                      {deliveriesErrorByWebhook[w.id] && (
                        <p className="text-sm text-destructive">{deliveriesErrorByWebhook[w.id]}</p>
                      )}
                      {deliveriesByWebhook[w.id] && deliveriesByWebhook[w.id].length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No deliveries yet. Confirm worker is running and an event was ingested after webhook creation.
                        </p>
                      )}
                      {deliveriesByWebhook[w.id] && deliveriesByWebhook[w.id].length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="border-b text-left">
                              <tr>
                                <th className="py-1 pr-2">Time</th>
                                <th className="py-1 pr-2">Status</th>
                                <th className="py-1 pr-2">HTTP</th>
                                <th className="py-1 pr-2">Attempt</th>
                                <th className="py-1 pr-2">Duration</th>
                                <th className="py-1">Event ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {deliveriesByWebhook[w.id].map((d) => (
                                <tr key={d.id} className="border-b last:border-b-0">
                                  <td className="py-1 pr-2 text-muted-foreground">{fmtDate(d.createdAt)}</td>
                                  <td className="py-1 pr-2">{d.status}</td>
                                  <td className="py-1 pr-2">{d.responseStatus ?? '-'}</td>
                                  <td className="py-1 pr-2">{d.attempt}</td>
                                  <td className="py-1 pr-2">{d.durationMs != null ? `${d.durationMs}ms` : '-'}</td>
                                  <td className="py-1 font-mono">{d.eventId}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href="/reference" className="text-sm text-brand-600 hover:underline mt-4 inline-block">
            Open API Reference for webhook create/disable/enable and deliveries
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
