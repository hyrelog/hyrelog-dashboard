import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeExportDownloadErrorBody } from '@/lib/exports/sanitize-upstream-error';

test('sanitizeExportDownloadErrorBody strips unknown keys and truncates long errors', () => {
  const long = 'x'.repeat(600);
  const out = sanitizeExportDownloadErrorBody({
    error: long,
    code: 'STREAM_ERROR',
    stack: 'at Object.<anonymous>',
    details: { path: '/secret' },
    maxBytes: 1024,
  });
  assert.equal(out.code, 'STREAM_ERROR');
  assert.equal(out.error, 'Download failed');
  assert.equal(out.maxBytes, 1024);
  assert.equal((out as { stack?: string }).stack, undefined);
});

test('sanitizeExportDownloadErrorBody handles non-objects', () => {
  const out = sanitizeExportDownloadErrorBody('<html>error</html>');
  assert.equal(out.code, 'UPSTREAM_ERROR');
});
