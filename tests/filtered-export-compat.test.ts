import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HyreLogApiError } from '@/lib/hyrelog-api/client';
import {
  FILTERED_EXPORT_UNAVAILABLE_USER_MESSAGE,
  GENERIC_EXPORT_CREATE_FAILED_MESSAGE,
  computeExplorerExportButtonState,
  isFilteredDashboardExportUnavailableError,
  userMessageForCreateDashboardExportFailure,
} from '@/lib/hyrelog-api/dashboard-filtered-export-compat';

test('isFilteredDashboardExportUnavailableError: 404 and 501', () => {
  assert.equal(isFilteredDashboardExportUnavailableError(404, { code: 'NOT_FOUND' }), true);
  assert.equal(isFilteredDashboardExportUnavailableError(501, { code: 'ANY' }), true);
});

test('isFilteredDashboardExportUnavailableError: NOT_IMPLEMENTED body', () => {
  assert.equal(isFilteredDashboardExportUnavailableError(400, { code: 'NOT_IMPLEMENTED' }), true);
});

test('isFilteredDashboardExportUnavailableError: false for typical client errors', () => {
  assert.equal(isFilteredDashboardExportUnavailableError(400, { code: 'VALIDATION_ERROR' }), false);
  assert.equal(isFilteredDashboardExportUnavailableError(403, { code: 'FORBIDDEN' }), false);
  assert.equal(isFilteredDashboardExportUnavailableError(402, { code: 'PLAN_LIMIT' }), false);
});

test('userMessageForCreateDashboardExportFailure: 404/501 HyreLogApiError → environment message', () => {
  assert.equal(
    userMessageForCreateDashboardExportFailure(new HyreLogApiError(404, { code: 'NOT_FOUND' })),
    FILTERED_EXPORT_UNAVAILABLE_USER_MESSAGE
  );
  assert.equal(
    userMessageForCreateDashboardExportFailure(new HyreLogApiError(501, { code: 'NOT_IMPLEMENTED' })),
    FILTERED_EXPORT_UNAVAILABLE_USER_MESSAGE
  );
});

test('userMessageForCreateDashboardExportFailure: other HyreLogApiError → generic copy', () => {
  assert.equal(
    userMessageForCreateDashboardExportFailure(new HyreLogApiError(403, { code: 'FORBIDDEN' })),
    GENERIC_EXPORT_CREATE_FAILED_MESSAGE
  );
  assert.equal(
    userMessageForCreateDashboardExportFailure(new HyreLogApiError(400, { code: 'VALIDATION_ERROR' })),
    GENERIC_EXPORT_CREATE_FAILED_MESSAGE
  );
});

test('userMessageForCreateDashboardExportFailure: non-API error', () => {
  assert.equal(userMessageForCreateDashboardExportFailure(new Error('network')), 'Export could not be created. Please try again later.');
});

test('computeExplorerExportButtonState: disables export when capability false', () => {
  const s = computeExplorerExportButtonState({
    apiConfigured: true,
    resolvedOk: true,
    scopeError: null,
    filteredExportsAvailable: false,
  });
  assert.equal(s.disabled, true);
  assert.equal(s.reason, FILTERED_EXPORT_UNAVAILABLE_USER_MESSAGE);
});

test('computeExplorerExportButtonState: enables when capability true and resolved', () => {
  const s = computeExplorerExportButtonState({
    apiConfigured: true,
    resolvedOk: true,
    scopeError: null,
    filteredExportsAvailable: true,
  });
  assert.equal(s.disabled, false);
  assert.equal(s.reason, null);
});
