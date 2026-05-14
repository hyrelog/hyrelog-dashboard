import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDashboardExportCreateBody,
  explorerExportHasNoNarrowingFilters,
  formatExplorerFiltersSummary,
} from '@/lib/events/explorer-export-request';
import { defaultExplorerUrlState } from '@/lib/events/explorer-url';
import { createExplorerExportJobInputSchema } from '@/schemas/exports';

const WS = 'aaaaaaaa-bbbb-4ccc-8eee-eeeeeeeeeeee';

test('buildDashboardExportCreateBody: member-style scoped workspace + filters', () => {
  const body = buildDashboardExportCreateBody({
    hyrelogWorkspaceId: WS,
    explorer: { from: '2026-01-01T00:00:00.000Z', to: '', category: 'auth', action: '' },
    format: 'json',
  });
  assert.equal(body.format, 'JSONL');
  assert.equal(body.filters?.workspaceId, WS);
  assert.equal(body.filters?.category, 'auth');
  assert.equal(body.filters?.to, undefined);
});

test('buildDashboardExportCreateBody: company-wide omits workspace when hyrelog id null', () => {
  const body = buildDashboardExportCreateBody({
    hyrelogWorkspaceId: null,
    explorer: { from: '', to: '', category: '', action: '' },
    format: 'csv',
  });
  assert.equal(body.format, 'CSV');
  assert.equal(body.filters?.workspaceId, undefined);
});

test('explorerExportHasNoNarrowingFilters: true for empty admin-style query', () => {
  const ex = defaultExplorerUrlState();
  assert.equal(
    explorerExportHasNoNarrowingFilters({ hyrelogWorkspaceId: null, explorer: ex }),
    true
  );
});

test('explorerExportHasNoNarrowingFilters: false when date set', () => {
  const ex = { ...defaultExplorerUrlState(), from: '2026-01-01T00:00:00.000Z' };
  assert.equal(
    explorerExportHasNoNarrowingFilters({ hyrelogWorkspaceId: null, explorer: ex }),
    false
  );
});

test('formatExplorerFiltersSummary includes all workspaces for admin', () => {
  const lines = formatExplorerFiltersSummary({
    workspaceLabel: null,
    explorer: { ...defaultExplorerUrlState(), dashboardWorkspaceId: '' },
    companyRole: 'ADMIN',
  });
  assert.ok(lines.some((l) => l.includes('All workspaces')));
});

test('createExplorerExportJobInputSchema rejects bad format', () => {
  const r = createExplorerExportJobInputSchema.safeParse({ format: 'xml' });
  assert.equal(r.success, false);
});

test('explorerExportHasNoNarrowingFilters: false when savedExplorerViewId set', () => {
  const ex = defaultExplorerUrlState();
  assert.equal(
    explorerExportHasNoNarrowingFilters({
      hyrelogWorkspaceId: null,
      explorer: ex,
      savedExplorerViewId: 'aaaaaaaa-bbbb-4ccc-8eee-eeeeeeeeeeee',
    }),
    false
  );
});

test('createExplorerExportJobInputSchema accepts csv', () => {
  const r = createExplorerExportJobInputSchema.safeParse({
    format: 'csv',
    dashboardWorkspaceId: WS,
    from: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.format, 'csv');
    assert.equal(r.data.dashboardWorkspaceId, WS);
  }
});
