/**
 * Filtered dashboard export (POST /dashboard/exports) compatibility.
 *
 * Deployment: deploy hyrelog-api with POST /dashboard/exports and GET /dashboard/exports/capabilities
 * before or alongside hyrelog-dashboard so the events explorer can probe availability without side effects.
 */

import { HyreLogApiError, type ApiError } from './client';

export const FILTERED_EXPORT_UNAVAILABLE_USER_MESSAGE =
  'Filtered exports are not available in this environment yet.';

export const GENERIC_EXPORT_CREATE_FAILED_MESSAGE =
  'Export could not be created. Your plan may not include exports, or the request was not valid.';

export function isFilteredDashboardExportUnavailableError(
  status: number,
  body?: ApiError | null
): boolean {
  if (status === 404 || status === 501) return true;
  const code = body && typeof body === 'object' && 'code' in body ? String(body.code) : '';
  return code === 'NOT_IMPLEMENTED';
}

export function userMessageForCreateDashboardExportFailure(err: unknown): string {
  if (err instanceof HyreLogApiError) {
    if (isFilteredDashboardExportUnavailableError(err.status, err.body)) {
      return FILTERED_EXPORT_UNAVAILABLE_USER_MESSAGE;
    }
    return GENERIC_EXPORT_CREATE_FAILED_MESSAGE;
  }
  return 'Export could not be created. Please try again later.';
}

export function computeExplorerExportButtonState(args: {
  apiConfigured: boolean;
  resolvedOk: boolean;
  scopeError: string | null;
  filteredExportsAvailable: boolean;
}): { disabled: boolean; reason: string | null } {
  if (!args.apiConfigured) {
    return {
      disabled: true,
      reason: 'Configure HYRELOG_API_URL and DASHBOARD_SERVICE_TOKEN to create exports.',
    };
  }
  if (!args.resolvedOk) {
    return { disabled: true, reason: args.scopeError ?? 'Export is not available for the current workspace.' };
  }
  if (!args.filteredExportsAvailable) {
    return { disabled: true, reason: FILTERED_EXPORT_UNAVAILABLE_USER_MESSAGE };
  }
  return { disabled: false, reason: null };
}
