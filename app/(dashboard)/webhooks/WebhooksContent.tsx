'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

type Webhook = {
  id: string;
  url: string;
  status: string;
  events: string[];
  workspaceId: string;
  projectId?: string | null;
  createdAt: string;
};

export function WebhooksContent({
  webhooks,
  error,
  apiConfigured,
}: {
  webhooks: Webhook[];
  error: string | null;
  apiConfigured: boolean;
}) {
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
    <div className="space-y-6">
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
                <li key={w.id} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{w.url}</span>
                  <span className="text-sm text-muted-foreground shrink-0">{w.status}</span>
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
