/**
 * Typed, first-party saved-view analytics (same emission policy as export-events).
 */

export type SavedExplorerViewAnalyticsEventName =
  | 'saved_view_created'
  | 'saved_view_updated'
  | 'saved_view_deleted'
  | 'saved_view_run';

const shouldEmit = process.env.HYRELOG_EXPORT_ANALYTICS_DEBUG === '1';

export function trackSavedExplorerViewEvent(
  name: SavedExplorerViewAnalyticsEventName,
  payload?: Record<string, unknown>
): void {
  if (!shouldEmit) return;
  // eslint-disable-next-line no-console -- intentional structured dev/debug stream
  console.log(
    JSON.stringify({
      kind: 'hyrelog.saved_explorer_view_analytics',
      name,
      ts: new Date().toISOString(),
      ...(payload ?? {}),
    })
  );
}
