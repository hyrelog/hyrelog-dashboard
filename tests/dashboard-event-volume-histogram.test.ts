import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildHistogramSubWindows } from '../lib/dashboard/event-volume-histogram';

describe('buildHistogramSubWindows', () => {
  it('returns empty array for invalid window', () => {
    assert.deepEqual(buildHistogramSubWindows('1h', '2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z'), []);
  });

  it('returns fixed bucket count for 24h', () => {
    const segs = buildHistogramSubWindows('24h', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z');
    assert.equal(segs.length, 8);
    assert.ok(segs.every((s) => s.from < s.to || s.from === s.to));
  });
});
