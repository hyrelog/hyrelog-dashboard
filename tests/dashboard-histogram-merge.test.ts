import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeHistogramGroupTotals, mapMergedToNamedCounts } from '../lib/dashboard/histogram-merge';
import type { DashboardEventHistogramResponse } from '../lib/hyrelog-api';

describe('histogram-merge', () => {
  it('mergeHistogramGroupTotals sums groupBy none buckets into __total__', () => {
    const data = {
      meta: { groupBy: 'none' as const, partial: false },
      buckets: [
        { start: 'a', end: 'b', count: 3, groups: [] },
        { start: 'b', end: 'c', count: 2, groups: [] },
      ],
    } as unknown as DashboardEventHistogramResponse;
    const m = mergeHistogramGroupTotals(data);
    assert.equal(m.get('__total__'), 5);
  });

  it('mergeHistogramGroupTotals merges keys across buckets', () => {
    const data = {
      meta: { groupBy: 'category' as const, partial: false },
      buckets: [
        {
          start: 'a',
          end: 'b',
          count: 2,
          groups: [
            { key: 'auth', count: 1 },
            { key: 'billing', count: 1 },
          ],
        },
        {
          start: 'b',
          end: 'c',
          count: 3,
          groups: [{ key: 'auth', count: 3 }],
        },
      ],
    } as unknown as DashboardEventHistogramResponse;
    const m = mergeHistogramGroupTotals(data);
    assert.equal(m.get('auth'), 4);
    assert.equal(m.get('billing'), 1);
  });

  it('mapMergedToNamedCounts excludes __total__ by default', () => {
    const m = new Map<string, number>([
      ['__total__', 99],
      ['x', 1],
    ]);
    const rows = mapMergedToNamedCounts(m);
    assert.deepEqual(rows, [{ name: 'x', count: 1 }]);
  });
});
