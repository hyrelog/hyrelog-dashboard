/**
 * Typed, first-party export analytics hooks (no third-party SDK).
 * Emits structured JSON to the server console only when HYRELOG_EXPORT_ANALYTICS_DEBUG=1
 * or in development — default production is a no-op.
 */

export type ExportAnalyticsEventName =
  | 'export_created'
  | 'export_rerun'
  | 'export_template_saved'
  | 'export_template_run'
  | 'export_download_started'
  | 'export_download_completed'
  | 'export_download_failed'
  | 'export_viewed'
  | 'export_cancelled';

const shouldEmit = process.env.HYRELOG_EXPORT_ANALYTICS_DEBUG === '1';

export function trackExportEvent(name: ExportAnalyticsEventName, payload?: Record<string, unknown>): void {
  if (!shouldEmit) return;
  // eslint-disable-next-line no-console -- intentional structured dev/debug stream
  console.log(
    JSON.stringify({
      kind: 'hyrelog.export_analytics',
      name,
      ts: new Date().toISOString(),
      ...(payload ?? {}),
    })
  );
}
