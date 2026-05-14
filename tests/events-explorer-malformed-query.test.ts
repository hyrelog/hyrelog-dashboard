import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  flattenExplorerSearchParamsForSchema,
  parseEventsExplorerSearchParams,
  parseEventsExplorerSearchParamsFromFlat,
} from '@/lib/events/explorer-url';
import { eventsExplorerQuerySchema } from '@/schemas/events';

test('malformed page falls back to 1', () => {
  const s = parseEventsExplorerSearchParams({ page: ['0', '99'] });
  assert.equal(s.page, 1);
  const s2 = parseEventsExplorerSearchParams({ page: 'not-a-number' });
  assert.equal(s2.page, 1);
});

test('huge pageSize falls back to default 10', () => {
  const s = parseEventsExplorerSearchParams({ pageSize: '99999' });
  assert.equal(s.pageSize, 10);
});

test('invalid date strings yield empty from/to', () => {
  const s = parseEventsExplorerSearchParams({ from: 'not-a-date', to: '2026-13-45' });
  assert.equal(s.from, '');
  assert.equal(s.to, '');
});

test('invalid sort/order normalize safely', () => {
  const s = parseEventsExplorerSearchParams({ sort: 'bogus', order: 'sideways' });
  assert.equal(s.sort, 'timestamp');
  assert.equal(s.order, 'desc');
});

test('unsupported query params are ignored; supported params preserved', () => {
  const s = parseEventsExplorerSearchParams({
    actor: 'should-ignore',
    traceId: 'x',
    category: 'auth',
    page: '3',
    pageSize: '50',
  } as Record<string, string>);
  assert.equal(s.category, 'auth');
  assert.equal(s.page, 3);
  assert.equal(s.pageSize, 50);
});

test('flatten + zod safeParse accepts oversized values after clamp', () => {
  const long = 'x'.repeat(500);
  const flat = flattenExplorerSearchParamsForSchema({ category: long, unknownKey: 'drop' } as Record<string, string>);
  assert.equal(flat.unknownKey, undefined);
  assert.equal(flat.category?.length, 256);
  const z = eventsExplorerQuerySchema.safeParse(flat);
  assert.equal(z.success, true);
});

test('parseEventsExplorerSearchParamsFromFlat matches full parse for same flat', () => {
  const sp = { workspaceId: 'aaaaaaaa-bbbb-4ccc-8eee-eeeeeeeeeeee', ref: 'dashboard' };
  const flat = flattenExplorerSearchParamsForSchema(sp);
  assert.deepEqual(parseEventsExplorerSearchParams(sp), parseEventsExplorerSearchParamsFromFlat(flat));
});
