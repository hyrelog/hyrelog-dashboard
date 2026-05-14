import type { ExplorerEventRow } from '@/lib/events/event-row-format';

const SENSITIVE_KEY_RE =
  /^(api[_-]?key|authorization|password|secret|token|credential|private[_-]?key|access[_-]?token)$/i;

/** Strip keys that could hold secrets from copied / displayed JSON. */
export function sanitizeEventJsonForDisplay(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeEventJsonForDisplay(v));
  }
  if (typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = '[redacted]';
      continue;
    }
    out[k] = sanitizeEventJsonForDisplay(v);
  }
  return out;
}

export type DrawerEventDetail = ExplorerEventRow & {
  traceId?: string | null;
  ipAddress?: string | null;
  geo?: string | null;
  userAgent?: string | null;
  metadata: unknown;
};

export function formatJsonPretty(value: unknown, space = 2): string {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return String(value);
  }
}
