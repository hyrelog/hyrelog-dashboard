import type { EventVolumeRangeKey, EventVolumeRangeTotal, NamedCount } from './types';

const RANGE_ORDER: EventVolumeRangeKey[] = ['1h', '24h', '7d', '30d'];

export function rangeLabel(key: EventVolumeRangeKey): string {
  switch (key) {
    case '1h':
      return '1h';
    case '24h':
      return '24h';
    case '7d':
      return '7d';
    case '30d':
      return '30d';
    default:
      return key;
  }
}

export function orderedRangeTotals(totals: EventVolumeRangeTotal[]): EventVolumeRangeTotal[] {
  return RANGE_ORDER.map((key) => totals.find((t) => t.key === key)).filter(
    (t): t is EventVolumeRangeTotal => t != null
  );
}

/** Normalized segment widths for a simple bar chart (0–100). */
export function normalizeTotalsToSegments(totals: EventVolumeRangeTotal[]): number[] {
  const vals = orderedRangeTotals(totals).map((t) => t.total);
  const max = Math.max(1, ...vals);
  return vals.map((v) => Math.round((v / max) * 100));
}

export function aggregateNamedCounts(
  rows: { category: string; action: string }[],
  pick: 'category' | 'action',
  topN: number
): NamedCount[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = pick === 'category' ? row.category : row.action;
    const key = raw?.trim() ? raw.trim() : '—';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export function volumeChartDisclaimer(options: {
  histogramsLoaded: boolean;
  histogramsPartial: boolean;
  histogramSource?: 'native' | 'partitioned';
}): string {
  if (!options.histogramsLoaded) {
    return 'Window totals come from HyreLog. Intra-window buckets were not loaded.';
  }
  if (options.histogramSource === 'native') {
    if (options.histogramsPartial) {
      return 'Intra-window bars use HyreLog native time buckets; at least one window is flagged partial (truncation or sum drift vs the headline total).';
    }
    return 'Intra-window bars are exact HyreLog SQL counts per UTC time bucket (same filters as headline totals).';
  }
  if (options.histogramsPartial) {
    return 'Buckets use partitioned HyreLog totals; at least one window had a mismatch or failed slice—treat the shape as approximate.';
  }
  return 'Selected tab shows UTC sub-buckets from partitioned HyreLog totals (not sampled rows). Window headline totals stay authoritative.';
}

/** Top N rows plus an "Other" bucket for compact legends (accessibility-friendly). */
export function takeTopNamedWithOther(rows: NamedCount[], topN: number): NamedCount[] {
  if (rows.length <= topN) return rows;
  const head = rows.slice(0, topN);
  const other = rows.slice(topN).reduce((s, r) => s + r.count, 0);
  return other > 0 ? [...head, { name: 'Other', count: other }] : head;
}

export function aggregateGeoCounts(rows: { geo?: string | null }[], topN: number): NamedCount[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = row.geo?.trim();
    const key = raw ? raw : '—';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
