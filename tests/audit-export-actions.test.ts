import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuditAction } from '@/generated/prisma/client';

test('AuditAction includes dedicated export evidence values', () => {
  assert.equal(AuditAction.EXPORT_CREATED, 'EXPORT_CREATED');
  assert.equal(AuditAction.EXPORT_RERUN, 'EXPORT_RERUN');
  assert.equal(AuditAction.EXPORT_TEMPLATE_SAVED, 'EXPORT_TEMPLATE_SAVED');
  assert.equal(AuditAction.EXPORT_TEMPLATE_RUN, 'EXPORT_TEMPLATE_RUN');
  assert.equal(AuditAction.EXPORT_DOWNLOAD_STARTED, 'EXPORT_DOWNLOAD_STARTED');
  assert.equal(AuditAction.EXPORT_DOWNLOAD_COMPLETED, 'EXPORT_DOWNLOAD_COMPLETED');
  assert.equal(AuditAction.EXPORT_DOWNLOAD_FAILED, 'EXPORT_DOWNLOAD_FAILED');
  assert.equal(AuditAction.SAVED_VIEW_CREATED, 'SAVED_VIEW_CREATED');
  assert.equal(AuditAction.SAVED_VIEW_UPDATED, 'SAVED_VIEW_UPDATED');
  assert.equal(AuditAction.SAVED_VIEW_DELETED, 'SAVED_VIEW_DELETED');
  assert.equal(AuditAction.SAVED_VIEW_RUN, 'SAVED_VIEW_RUN');
});
