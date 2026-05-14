import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  exportDownloadUiState,
  exportFiltersToExplorerHref,
  exportJobSummaryToExplorerHref,
  exportLifecycleDetail,
  exportLifecycleHeadline,
  exportStatusBadgeTone,
  formatExportFiltersSummaryLines,
  formatExportStatusLabel,
  formatRequestedByLine,
} from '@/lib/exports/export-job-ui';

test('formatExportStatusLabel maps known statuses', () => {
  assert.equal(formatExportStatusLabel('PENDING'), 'Queued');
  assert.equal(formatExportStatusLabel('SUCCEEDED'), 'Finished');
  assert.equal(formatExportStatusLabel('UNKNOWN_FOO'), 'UNKNOWN FOO');
});

test('exportLifecycleHeadline', () => {
  assert.ok(exportLifecycleHeadline('PENDING').includes('Preparing'));
  assert.ok(exportLifecycleHeadline('RUNNING').includes('Streaming'));
});

test('exportLifecycleDetail for CANCELED mentions stream', () => {
  const d = exportLifecycleDetail('CANCELED');
  assert.ok(d && d.toLowerCase().includes('stream'));
});

test('exportStatusBadgeTone', () => {
  assert.equal(exportStatusBadgeTone('SUCCEEDED'), 'success');
  assert.equal(exportStatusBadgeTone('FAILED'), 'destructive');
  assert.equal(exportStatusBadgeTone('RUNNING'), 'progress');
});

test('formatExportFiltersSummaryLines', () => {
  const lines = formatExportFiltersSummaryLines({
    from: '2026-01-01T00:00:00.000Z',
    category: 'auth',
  });
  assert.ok(lines.some((l) => l.includes('From')));
  assert.ok(lines.some((l) => l.includes('auth')));
});

test('formatExportFiltersSummaryLines: company-wide with no manual filters', () => {
  const lines = formatExportFiltersSummaryLines({}, { workspaceId: null, workspaceName: null });
  assert.equal(lines.length, 1);
  assert.ok(lines[0].includes('All workspaces'));
});

test('formatExportFiltersSummaryLines: workspace-only scope', () => {
  const lines = formatExportFiltersSummaryLines({}, { workspaceId: '11111111-1111-4111-8111-111111111111', workspaceName: 'Acme' });
  assert.ok(lines.some((l) => l.includes('Workspace: Acme')));
  assert.ok(lines.some((l) => l.includes('only a workspace')));
});

test('exportFiltersToExplorerHref builds /events query', () => {
  const href = exportFiltersToExplorerHref({
    filtersSummary: { from: '2026-01-01T00:00:00.000Z', category: 'x' },
    explorerDashboardWorkspaceId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  });
  assert.ok(href.startsWith('/events?'));
  assert.ok(href.includes('workspaceId=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'));
  assert.ok(href.includes('from='));
});

test('exportJobSummaryToExplorerHref matches exportFiltersToExplorerHref', () => {
  const job = {
    filtersSummary: { from: '2026-01-01T00:00:00.000Z' as const },
    explorerDashboardWorkspaceId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  };
  assert.equal(exportJobSummaryToExplorerHref(job), exportFiltersToExplorerHref(job));
});

test('exportDownloadUiState: PENDING available', () => {
  const s = exportDownloadUiState('PENDING');
  assert.equal(s.kind, 'available');
});

test('exportDownloadUiState: SUCCEEDED completed copy', () => {
  const s = exportDownloadUiState('SUCCEEDED');
  assert.equal(s.kind, 'completed');
  assert.ok(s.label.toLowerCase().includes('stream'));
});

test('formatRequestedByLine', () => {
  assert.equal(formatRequestedByLine('DASHBOARD_USER'), 'Dashboard');
  assert.equal(formatRequestedByLine('API_KEY'), 'API integration');
});
