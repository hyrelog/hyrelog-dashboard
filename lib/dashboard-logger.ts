/**
 * Structured dashboard logs (server). No secrets, tokens, raw events, or PII.
 * Prefix: [hyrelog-dashboard]
 */

type DashboardLogLevel = 'info' | 'warn' | 'error';

const PREFIX = '[hyrelog-dashboard]';

function safeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta || Object.keys(meta).length === 0) return undefined;
  return meta;
}

function write(level: DashboardLogLevel, event: string, meta?: Record<string, unknown>) {
  const m = safeMeta(meta);
  const payload = m ? `${PREFIX} ${event} ${JSON.stringify(m)}` : `${PREFIX} ${event}`;
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

export const dashboardLog = {
  info(event: string, meta?: Record<string, unknown>) {
    write('info', event, meta);
  },
  warn(event: string, meta?: Record<string, unknown>) {
    write('warn', event, meta);
  },
  error(event: string, meta?: Record<string, unknown>) {
    write('error', event, meta);
  },
};
