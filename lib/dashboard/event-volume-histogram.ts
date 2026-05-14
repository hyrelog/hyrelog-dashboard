import type { EventVolumeRangeKey } from './types';

export type HistogramSubWindow = {
  from: string;
  to: string;
  /** Short label for chart axis (UTC). */
  label: string;
};

const BUCKET_COUNTS: Record<EventVolumeRangeKey, number> = {
  '1h': 6,
  '24h': 8,
  '7d': 7,
  '30d': 6,
};

/**
 * Partition [windowFrom, windowTo) into equal UTC spans for HyreLog `from`/`to` count queries.
 * Labels are minimal (clock or day) for axis density.
 */
export function buildHistogramSubWindows(
  rangeKey: EventVolumeRangeKey,
  windowFromIso: string,
  windowToIso: string
): HistogramSubWindow[] {
  const start = new Date(windowFromIso).getTime();
  const end = new Date(windowToIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const n = BUCKET_COUNTS[rangeKey];
  const stepMs = (end - start) / n;
  const out: HistogramSubWindow[] = [];

  for (let i = 0; i < n; i++) {
    const segStart = start + Math.floor(i * stepMs);
    const segEnd = i === n - 1 ? end : start + Math.floor((i + 1) * stepMs);
    const from = new Date(segStart).toISOString();
    /** HyreLog uses `lte` on `to`; avoid double-count at boundaries (half-open except last slice). */
    const toExclusive = i === n - 1 ? segEnd : segEnd - 1;
    const to = new Date(toExclusive).toISOString();
    out.push({
      from,
      to,
      label: axisLabelForSegment(rangeKey, segStart, segEnd),
    });
  }

  return out;
}

function axisLabelForSegment(rangeKey: EventVolumeRangeKey, segStartMs: number, _segEndMs: number): string {
  const s = new Date(segStartMs);
  const pad = (x: number) => String(x).padStart(2, '0');

  if (rangeKey === '1h') {
    return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`;
  }
  if (rangeKey === '24h') {
    return `${pad(s.getUTCHours())}:00`;
  }
  if (rangeKey === '7d') {
    return `${s.getUTCMonth() + 1}/${pad(s.getUTCDate())}`;
  }
  // 30d — coarse buckets (~5 days each)
  return `${s.getUTCMonth() + 1}/${pad(s.getUTCDate())}`;
}
