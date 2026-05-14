import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatJsonPretty, sanitizeEventJsonForDisplay } from '@/lib/events/event-detail-format';
import {
  extractExplorerRowContext,
  extractIntegrityHints,
  formatActorCell,
  formatEventIdShort,
  formatIntegrityBadge,
  formatResourceCell,
} from '@/lib/events/event-row-format';

test('formatActorCell prefers email', () => {
  assert.equal(formatActorCell({ actorEmail: 'a@b.co', actorId: 'id1', actorRole: null }), 'a@b.co');
  assert.equal(formatActorCell({ actorEmail: null, actorId: 'id1', actorRole: null }), 'id1');
  assert.equal(formatActorCell({ actorEmail: '  ', actorId: null, actorRole: 'MEMBER' }), 'MEMBER');
});

test('formatResourceCell joins type and id', () => {
  assert.equal(formatResourceCell({ resourceType: 'user', resourceId: 'u1' }), 'user:u1');
  assert.equal(formatResourceCell({ resourceType: null, resourceId: 'x' }), 'x');
});

test('formatEventIdShort truncates long ids', () => {
  const id = '12345678-abcd-4000-8000-00000000ffff';
  const s = formatEventIdShort(id, 12);
  assert.ok(s.includes('…'));
});

test('extractIntegrityHints reads nested metadata keys', () => {
  const h = extractIntegrityHints({ eventHash: 'aa', prevHash: 'bb', integrityStatus: 'ok' });
  assert.equal(h?.hash, 'aa');
  assert.equal(h?.prevHash, 'bb');
  assert.equal(formatIntegrityBadge(h), 'ok');
});

test('extractExplorerRowContext reads workspace and project hints', () => {
  assert.deepEqual(extractExplorerRowContext({ workspaceName: 'Prod', projectName: 'api' }), {
    workspace: 'Prod',
    project: 'api',
  });
  assert.deepEqual(extractExplorerRowContext(null), {});
});

test('sanitizeEventJsonForDisplay redacts sensitive keys recursively', () => {
  const out = sanitizeEventJsonForDisplay({
    ok: true,
    nested: { apiKey: 'secret', safe: 1 },
  }) as { nested: { apiKey: string; safe: number } };
  assert.equal(out.nested.apiKey, '[redacted]');
  assert.equal(out.nested.safe, 1);
});

test('formatJsonPretty returns valid JSON string', () => {
  const s = formatJsonPretty({ a: 1 });
  assert.equal(s, '{\n  "a": 1\n}');
});
