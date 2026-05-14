import { getDashboardEvents, getDashboardEventHistogram } from '@/lib/hyrelog-api';
import type { ActorHeaders } from '@/lib/hyrelog-api/client';
import { dashboardLog } from '@/lib/dashboard-logger';
import { buildHistogramSubWindows } from './event-volume-histogram';
import type { EventVolumeRangeKey, EventVolumeRangeHistogram, EventVolumeRangeTotal } from './types';

type Actor = ActorHeaders & { companyId: string };

const CHUNK = 12;

/** True when native histogram API is explicitly turned off (`HYRELOG_NATIVE_EVENT_HISTOGRAM=false`). */
export function isNativeHistogramExplicitlyDisabled(): boolean {
  return process.env.HYRELOG_NATIVE_EVENT_HISTOGRAM === 'false';
}

function histogramApiIntervalForRange(key: EventVolumeRangeKey): 'minute' | 'hour' | 'day' {
  if (key === '1h') return 'minute';
  if (key === '24h') return 'hour';
  return 'day';
}

function exclusiveEndToInclusiveApiTo(endExclusiveIso: string): string {
  const t = new Date(endExclusiveIso).getTime();
  if (!Number.isFinite(t)) return endExclusiveIso;
  return new Date(Math.max(0, t - 1)).toISOString();
}

function nativeBucketLabel(rangeKey: EventVolumeRangeKey, startIso: string): string {
  const s = new Date(startIso);
  const pad = (x: number) => String(x).padStart(2, '0');
  if (rangeKey === '1h') return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`;
  if (rangeKey === '24h') return `${pad(s.getUTCHours())}:00`;
  return `${s.getUTCMonth() + 1}/${pad(s.getUTCDate())}`;
}

async function mapChunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const part = await Promise.all(slice.map(fn));
    out.push(...part);
  }
  return out;
}

export type EventVolumeHistogramFetchResult = {
  histograms: Partial<Record<EventVolumeRangeKey, EventVolumeRangeHistogram>>;
  source: 'native' | 'partitioned';
};

/**
 * Tries GET /dashboard/events/metrics/histogram per window (same filters as list).
 * Falls back to partitioned `getDashboardEvents` totals when native is disabled, returns 404/400, or errors.
 */
export async function fetchEventVolumeHistograms(options: {
  actor: Actor;
  workspaceApiId?: string;
  windows: EventVolumeRangeTotal[];
}): Promise<EventVolumeHistogramFetchResult> {
  const { actor, workspaceApiId, windows } = options;

  if (!isNativeHistogramExplicitlyDisabled()) {
    try {
      const native = await fetchNativeHistograms(actor, workspaceApiId, windows);
      if (native) return { histograms: native, source: 'native' };
      dashboardLog.warn('dashboard_histogram_native_fallback', { reason: 'native_histogram_empty' });
    } catch {
      dashboardLog.warn('dashboard_histogram_native_fallback', { reason: 'native_histogram_error' });
    }
  }

  const partitioned = await fetchPartitionedHistograms(actor, workspaceApiId, windows);
  return { histograms: partitioned, source: 'partitioned' };
}

async function fetchNativeHistograms(
  actor: Actor,
  workspaceApiId: string | undefined,
  windows: EventVolumeRangeTotal[]
): Promise<Partial<Record<EventVolumeRangeKey, EventVolumeRangeHistogram>> | null> {
  const result: Partial<Record<EventVolumeRangeKey, EventVolumeRangeHistogram>> = {};

  for (const w of windows) {
    const interval = histogramApiIntervalForRange(w.key);
    let data;
    try {
      data = await getDashboardEventHistogram(
        {
          from: w.from,
          to: w.to,
          interval,
          groupBy: 'none',
          ...(workspaceApiId ? { workspaceId: workspaceApiId } : {}),
        },
        actor
      );
    } catch {
      return null;
    }

    const buckets = data.buckets.map((b) => ({
      from: b.start,
      to: exclusiveEndToInclusiveApiTo(b.end),
      label: nativeBucketLabel(w.key, b.start),
      count: b.count,
    }));

    const bucketSum = buckets.reduce((a, b) => a + b.count, 0);
    const drift = Math.abs(bucketSum - w.total);
    const incomplete =
      data.meta.partial || drift > Math.max(1, Math.ceil(0.01 * w.total));

    result[w.key] = {
      buckets,
      bucketSum,
      windowTotal: w.total,
      incomplete,
      aggregation: 'native',
    };
  }

  return result;
}

async function fetchPartitionedHistograms(
  actor: Actor,
  workspaceApiId: string | undefined,
  windows: EventVolumeRangeTotal[]
): Promise<Partial<Record<EventVolumeRangeKey, EventVolumeRangeHistogram>>> {
  const result: Partial<Record<EventVolumeRangeKey, EventVolumeRangeHistogram>> = {};

  const tasks: Array<{
    key: EventVolumeRangeKey;
    windowTotal: number;
    sub: ReturnType<typeof buildHistogramSubWindows>;
  }> = [];

  for (const w of windows) {
    const sub = buildHistogramSubWindows(w.key, w.from, w.to);
    if (sub.length === 0) continue;
    tasks.push({ key: w.key, windowTotal: w.total, sub });
  }

  for (const t of tasks) {
    const counts = await mapChunked(t.sub, CHUNK, async (seg) => {
      try {
        const data = await getDashboardEvents(
          {
            limit: 1,
            offset: 0,
            sort: 'timestamp',
            order: 'desc',
            from: seg.from,
            to: seg.to,
            ...(workspaceApiId ? { workspaceId: workspaceApiId } : {}),
          },
          actor
        );
        return { seg, count: data.total };
      } catch {
        return { seg, count: -1 };
      }
    });

    const buckets = counts.map(({ seg, count }) => ({
      from: seg.from,
      to: seg.to,
      label: seg.label,
      count: Math.max(0, count),
    }));

    const anyFailed = counts.some((c) => c.count < 0);
    const bucketSum = buckets.reduce((a, b) => a + b.count, 0);
    const drift = Math.abs(bucketSum - t.windowTotal);
    const incomplete = anyFailed || drift > Math.max(1, Math.ceil(0.01 * t.windowTotal));

    result[t.key] = {
      buckets,
      bucketSum,
      windowTotal: t.windowTotal,
      incomplete,
      aggregation: 'partitioned',
    };
  }

  return result;
}
