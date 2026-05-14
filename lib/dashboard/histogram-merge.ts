import type { DashboardEventHistogramResponse } from '@/lib/hyrelog-api';
import type { NamedCount } from '@/lib/dashboard/types';

/** Merge per-bucket group keys into totals for the full window. */
export function mergeHistogramGroupTotals(data: DashboardEventHistogramResponse): Map<string, number> {
  const m = new Map<string, number>();
  if (data.meta.groupBy === 'none') {
    let sum = 0;
    for (const b of data.buckets) sum += b.count;
    m.set('__total__', sum);
    return m;
  }
  for (const b of data.buckets) {
    if (b.groups && b.groups.length > 0) {
      for (const g of b.groups) {
        const k = g.key?.trim() ? g.key : '—';
        m.set(k, (m.get(k) ?? 0) + g.count);
      }
    } else {
      m.set('—', (m.get('—') ?? 0) + b.count);
    }
  }
  return m;
}

export function mapMergedToNamedCounts(merged: Map<string, number>, excludeKeys: string[] = ['__total__']): NamedCount[] {
  const skip = new Set(excludeKeys);
  return [...merged.entries()]
    .filter(([k]) => !skip.has(k))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
