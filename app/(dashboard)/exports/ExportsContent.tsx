'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

type Job = {
  id: string;
  status: string;
  source: string;
  format: string;
  rowLimit: string;
  rowsExported: string;
  createdAt: string;
  finishedAt?: string;
  errorCode?: string | null;
};

export function ExportsContent({
  jobs,
  error,
  apiConfigured,
}: {
  jobs: Job[];
  error: string | null;
  apiConfigured: boolean;
}) {
  if (!apiConfigured) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Exports</h1>
        <p className="text-muted-foreground">
          Configure HYRELOG_API_URL and DASHBOARD_SERVICE_TOKEN to view export jobs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Exports</h1>
        <p className="text-muted-foreground">
          Export jobs created via the API. Create an export with POST /v1/exports (see API Reference).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Export jobs</CardTitle>
          <CardDescription>Recent export jobs. Download via GET /v1/exports/:jobId/download with your API key.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No export jobs yet.</p>
          ) : (
            <ul className="divide-y">
              {jobs.map((j) => (
                <li key={j.id} className="py-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-mono truncate">{j.id}</span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {j.status} | {j.source} | {j.format} | {j.rowsExported}/{j.rowLimit} rows
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/reference" className="text-sm text-brand-600 hover:underline mt-4 inline-block">
            Open API Reference to create or download exports
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
