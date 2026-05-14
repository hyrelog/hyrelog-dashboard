import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  defaultEventQueryForExplorer,
  eventQueryFromExplorerUrlState,
  eventQueryFromExplorerSearchParams,
  explorerUrlStateFromEventQuery,
  sanitizeEventQueryForPersistence,
  stableEventQueryJson,
} from '@/lib/events/event-query';
import { defaultExplorerUrlState, explorerPathWithQuery, parseEventsExplorerSearchParams } from '@/lib/events/explorer-url';

test('event query round-trip through URL params matches stable JSON', () => {
  const q = sanitizeEventQueryForPersistence({
    dashboardWorkspaceId: 'aaaaaaaa-bbbb-4ccc-8eee-eeeeeeeeeeee',
    categories: ['auth'],
    actions: ['login'],
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-01-02T00:00:00.000Z',
    sort: 'timestamp',
    order: 'desc',
    page: 2,
    pageSize: 50,
    ref: 'dashboard',
  });
  const path = explorerPathWithQuery(explorerUrlStateFromEventQuery(q, { savedExplorerViewId: 'bbbbbbbb-bbbb-4ccc-8eee-eeeeeeeeeeee' }));
  const qs = path.includes('?') ? path.split('?')[1] : '';
  const back = eventQueryFromExplorerSearchParams(new URLSearchParams(qs));
  assert.equal(stableEventQueryJson(back), stableEventQueryJson(q));
});

test('defaultEventQueryForExplorer matches empty explorer state mapping', () => {
  assert.equal(
    stableEventQueryJson(defaultEventQueryForExplorer()),
    stableEventQueryJson(eventQueryFromExplorerUrlState(defaultExplorerUrlState()))
  );
});

test('explorerUrlStateFromEventQuery attaches savedView id', () => {
  const sid = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const s = explorerUrlStateFromEventQuery(defaultEventQueryForExplorer(), { savedExplorerViewId: sid });
  assert.equal(s.savedExplorerViewId, sid);
});

test('invalid savedView id in opts is dropped', () => {
  const s = explorerUrlStateFromEventQuery(defaultEventQueryForExplorer(), { savedExplorerViewId: 'not-a-uuid' });
  assert.equal(s.savedExplorerViewId, '');
});

test('parseEventsExplorerSearchParams rejects malformed savedView', () => {
  const s = parseEventsExplorerSearchParams({ savedView: 'nope' });
  assert.equal(s.savedExplorerViewId, '');
});
