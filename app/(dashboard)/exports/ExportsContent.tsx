'use client';

import { useMemo, useState } from 'react';
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
  const [sortBy, setSortBy] = useState<'createdAt' | 'status' | 'source' | 'format' | 'rowsExported'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const formatNumber = (value: string) => {
    try {
      return BigInt(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    // Use a fixed locale/timezone to avoid SSR/client hydration mismatches.
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }).format(date) + ' UTC';
  };

  const formatRowLimit = (value: string) => {
    try {
      const big = BigInt(value);
      // Show a friendlier label when backend uses an effectively-unlimited cap.
      if (big >= BigInt('999999999999')) return 'Plan max';
      return big.toLocaleString();
    } catch {
      return value;
    }
  };

  const sortedJobs = useMemo(() => {
    const arr = [...jobs];
    arr.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'createdAt') {
        const av = new Date(a.createdAt).getTime();
        const bv = new Date(b.createdAt).getTime();
        return (av - bv) * direction;
      }
      if (sortBy === 'rowsExported') {
        let av = BigInt(0);
        let bv = BigInt(0);
        try {
          av = BigInt(a.rowsExported);
          bv = BigInt(b.rowsExported);
        } catch {
          // noop: keep default zeros for invalid values
        }
        return av === bv ? 0 : av > bv ? direction : -direction;
      }
      const av = a[sortBy].toLowerCase();
      const bv = b[sortBy].toLowerCase();
      return av === bv ? 0 : av > bv ? direction : -direction;
    });
    return arr;
  }, [jobs, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedJobs = sortedJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const onSort = (field: 'createdAt' | 'status' | 'source' | 'format' | 'rowsExported') => {
    setPage(1);
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDirection('asc');
  };

  const sortIndicator = (field: 'createdAt' | 'status' | 'source' | 'format' | 'rowsExported') => {
    if (sortBy !== field) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

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
    <div className="space-y-6 p-6">
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
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left">
                    <tr>
                      <th className="py-2 pr-3">
                        <button type="button" className="font-medium hover:underline" onClick={() => onSort('createdAt')}>
                          Created{sortIndicator('createdAt')}
                        </button>
                      </th>
                      <th className="py-2 pr-3">
                        <button type="button" className="font-medium hover:underline" onClick={() => onSort('status')}>
                          Status{sortIndicator('status')}
                        </button>
                      </th>
                      <th className="py-2 pr-3">
                        <button type="button" className="font-medium hover:underline" onClick={() => onSort('source')}>
                          Source{sortIndicator('source')}
                        </button>
                      </th>
                      <th className="py-2 pr-3">
                        <button type="button" className="font-medium hover:underline" onClick={() => onSort('format')}>
                          Format{sortIndicator('format')}
                        </button>
                      </th>
                      <th className="py-2 pr-3">
                        <button type="button" className="font-medium hover:underline" onClick={() => onSort('rowsExported')}>
                          Rows{sortIndicator('rowsExported')}
                        </button>
                      </th>
                      <th className="py-2">
                        Job ID
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedJobs.map((j) => (
                      <tr key={j.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-3 text-muted-foreground">{formatDateTime(j.createdAt)}</td>
                        <td className="py-2 pr-3">{j.status}</td>
                        <td className="py-2 pr-3">{j.source}</td>
                        <td className="py-2 pr-3">{j.format}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {formatNumber(j.rowsExported)}/{formatRowLimit(j.rowLimit)}
                        </td>
                        <td className="py-2 font-mono text-xs">{j.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-1 disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
          <Link href="/reference" className="text-sm text-brand-600 hover:underline mt-4 inline-block">
            Open API Reference to create or download exports
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
