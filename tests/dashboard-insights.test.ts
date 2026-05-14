import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveDashboardSignals } from '../lib/dashboard/insights';
import type { EventVolumeRangeTotal } from '../lib/dashboard/types';

const iso = (s: string) => s;

function zeroTotals(): EventVolumeRangeTotal[] {
  const to = iso('2026-01-08T00:00:00.000Z');
  return [
    { key: '1h', label: 'Past hour', from: iso('2026-01-07T23:00:00.000Z'), to, total: 0 },
    { key: '24h', label: 'Past 24 hours', from: iso('2026-01-07T00:00:00.000Z'), to, total: 0 },
    { key: '7d', label: 'Past 7 days', from: iso('2026-01-01T00:00:00.000Z'), to, total: 0 },
    { key: '30d', label: 'Past 30 days', from: iso('2025-12-09T00:00:00.000Z'), to, total: 0 },
  ];
}

const baseInput = {
  defaultWorkspaceDashboardId: null as string | null,
  volumeHistogramsPartial: false,
  eventVolumeHistogramSource: 'partitioned' as const,
  nativeGrouped7d: null,
  nativeGroupedPrev7d: null,
  periodComparison: null,
  workspaceBins7d: null,
  visibleWorkspaceDashboardIds: [] as string[],
  billingInfo: null as null,
  sevenDayExplorerRange: { from: iso('2026-01-01T00:00:00.000Z'), to: iso('2026-01-08T00:00:00.000Z') },
  loadError: null as string | null,
  apiConfigured: true,
};

describe('deriveDashboardSignals', () => {
  it('does not emit quantitative spike / WoW anomaly cards when there is no event data', () => {
    const { highlights, needsAttention } = deriveDashboardSignals({
      ...baseInput,
      companyScope: true,
      rangeTotals: zeroTotals(),
    });

    const anomalyIds = new Set([
      'up-24h',
      'up-7d',
      'down-24h',
      'cat-up',
      'workspace-spike',
      'workspace-skew',
      'quiet-workspaces',
      'security-volume',
      'billing-pressure',
    ]);

    for (const h of highlights) {
      assert.ok(!anomalyIds.has(h.id), `unexpected highlight ${h.id}`);
    }
    for (const n of needsAttention) {
      assert.ok(!anomalyIds.has(n.id), `unexpected needsAttention ${n.id}`);
    }
  });

  it('uses a generic load-error description (no raw upstream strings)', () => {
    const { needsAttention } = deriveDashboardSignals({
      ...baseInput,
      companyScope: false,
      defaultWorkspaceDashboardId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      rangeTotals: zeroTotals(),
      loadError: 'upstream 500 stack trace …',
    });
    const row = needsAttention.find((n) => n.id === 'load-error');
    assert.ok(row);
    assert.ok(!row!.description.includes('500'));
    assert.ok(!row!.description.includes('stack'));
  });
});
