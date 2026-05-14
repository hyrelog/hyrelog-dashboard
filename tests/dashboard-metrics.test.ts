import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateGeoCounts,
  aggregateNamedCounts,
  normalizeTotalsToSegments,
  orderedRangeTotals,
  takeTopNamedWithOther,
  volumeChartDisclaimer,
} from '../lib/dashboard/metrics';
import type { EventVolumeRangeTotal } from '../lib/dashboard/types';

describe('metrics', () => {
  it('orderedRangeTotals preserves canonical range order', () => {
    const totals: EventVolumeRangeTotal[] = [
      { key: '30d', label: '30d', from: 'a', to: 'b', total: 1 },
      { key: '1h', label: '1h', from: 'c', to: 'd', total: 4 },
    ];
    const o = orderedRangeTotals(totals);
    assert.deepEqual(
      o.map((t) => t.key),
      ['1h', '30d']
    );
  });

  it('normalizeTotalsToSegments avoids divide-by-zero', () => {
    const segs = normalizeTotalsToSegments([{ key: '1h', label: '1h', from: 'a', to: 'b', total: 0 }]);
    assert.deepEqual(segs, [0]);
  });

  it('aggregateNamedCounts buckets blank labels as em dash', () => {
    const rows = aggregateNamedCounts([{ category: '   ', action: 'go' }], 'category', 5);
    assert.equal(rows[0]?.name, '—');
  });

  it('aggregateGeoCounts treats missing geo as em dash bucket', () => {
    const rows = aggregateGeoCounts([{ geo: null }, { geo: 'EU' }], 5);
    assert.ok(rows.some((r) => r.name === '—'));
  });

  it('takeTopNamedWithOther adds Other when truncating', () => {
    const rows = [
      { name: 'a', count: 3 },
      { name: 'b', count: 2 },
      { name: 'c', count: 1 },
    ];
    const t = takeTopNamedWithOther(rows, 2);
    assert.ok(t.some((r) => r.name === 'Other'));
  });

  it('volumeChartDisclaimer when histograms not loaded', () => {
    const s = volumeChartDisclaimer({ histogramsLoaded: false, histogramsPartial: false });
    assert.ok(s.length > 10);
  });
});
