import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildEventsExplorerSearchParams,
  buildResetExplorerFilters,
  chipRemovalStateUpdate,
  defaultExplorerUrlState,
  explorerPathWithQuery,
  formatExplorerChipDate,
  isWorkspaceChipLockedForRole,
  parseEventsExplorerSearchParams,
} from '@/lib/events/explorer-url';

test('parseEventsExplorerSearchParams: supported filters and safe defaults', () => {
  const s = parseEventsExplorerSearchParams({
    workspaceId: 'not-a-uuid',
    from: 'invalid',
    category: '  auth  ',
    action: 'x'.repeat(300),
    sort: 'bogus',
    order: 'DESC',
    page: '0',
    pageSize: '999',
    ref: 'dashboard',
  });
  assert.equal(s.dashboardWorkspaceId, '');
  assert.equal(s.savedExplorerViewId, '');
  assert.equal(s.from, '');
  assert.equal(s.category, 'auth');
  assert.equal(s.action.length, 256);
  assert.equal(s.sort, 'timestamp');
  assert.equal(s.order, 'desc');
  assert.equal(s.page, 1);
  assert.equal(s.pageSize, 10);
  assert.equal(s.ref, 'dashboard');
});

test('parseEventsExplorerSearchParams: accepts valid workspace UUID', () => {
  const id = 'aaaaaaaa-bbbb-4ccc-8eee-eeeeeeeeeeee';
  const s = parseEventsExplorerSearchParams({ workspaceId: id });
  assert.equal(s.dashboardWorkspaceId, id);
});

test('explorerPathWithQuery round-trip preserves ref and non-default sort', () => {
  const state = {
    ...defaultExplorerUrlState(),
    dashboardWorkspaceId: '',
    savedExplorerViewId: '',
    sort: 'action' as const,
    order: 'asc' as const,
    page: 2,
    pageSize: 50 as const,
    ref: 'dashboard' as const,
  };
  const path = explorerPathWithQuery(state);
  assert.ok(path.includes('sort=action'));
  assert.ok(path.includes('order=asc'));
  assert.ok(path.includes('page=2'));
  assert.ok(path.includes('pageSize=50'));
  assert.ok(path.includes('ref=dashboard'));
  const back = parseEventsExplorerSearchParams(Object.fromEntries(new URLSearchParams(path.split('?')[1])));
  assert.equal(back.sort, 'action');
  assert.equal(back.order, 'asc');
  assert.equal(back.page, 2);
  assert.equal(back.pageSize, 50);
  assert.equal(back.ref, 'dashboard');
});

test('chipRemovalStateUpdate: category clears and resets page', () => {
  const cur = { ...defaultExplorerUrlState(), category: 'auth', page: 3 };
  const delta = chipRemovalStateUpdate('category', cur, { workspaceChipLocked: false });
  assert.deepEqual(delta, { category: '', page: 1, savedExplorerViewId: '' });
});

test('chipRemovalStateUpdate: workspace no-op when locked', () => {
  const cur = { ...defaultExplorerUrlState(), dashboardWorkspaceId: 'ws-1' };
  const delta = chipRemovalStateUpdate('workspace', cur, { workspaceChipLocked: true });
  assert.deepEqual(delta, {});
});

test('chipRemovalStateUpdate: workspace clears saved view link when not locked', () => {
  const cur = {
    ...defaultExplorerUrlState(),
    dashboardWorkspaceId: 'aaaaaaaa-bbbb-4ccc-8eee-eeeeeeeeeeee',
    savedExplorerViewId: 'bbbbbbbb-bbbb-4ccc-8eee-eeeeeeeeeeee',
  };
  const delta = chipRemovalStateUpdate('workspace', cur, { workspaceChipLocked: false });
  assert.deepEqual(delta, {
    dashboardWorkspaceId: '',
    page: 1,
    savedExplorerViewId: '',
  });
});

test('isWorkspaceChipLockedForRole: member single workspace', () => {
  assert.equal(isWorkspaceChipLockedForRole('MEMBER', 1), true);
  assert.equal(isWorkspaceChipLockedForRole('MEMBER', 2), false);
  assert.equal(isWorkspaceChipLockedForRole('ADMIN', 1), false);
});

test('buildResetExplorerFilters: admin clears workspace; member preserves current when permitted', () => {
  const ids = ['aaa', 'bbb'];
  const admin = buildResetExplorerFilters('ADMIN', ids, 'bbb');
  assert.equal(admin.dashboardWorkspaceId, '');
  assert.equal(admin.savedExplorerViewId, '');
  const member = buildResetExplorerFilters('MEMBER', ids, 'bbb');
  assert.equal(member.dashboardWorkspaceId, 'bbb');
  assert.equal(member.savedExplorerViewId, '');
  const memberFallback = buildResetExplorerFilters('MEMBER', ids, 'zzz');
  assert.equal(memberFallback.dashboardWorkspaceId, 'aaa');
  assert.equal(memberFallback.savedExplorerViewId, '');
});

test('formatExplorerChipDate uses UTC medium date', () => {
  const t = formatExplorerChipDate('2026-05-14T12:00:00.000Z');
  assert.match(t, /May/);
});

test('explorerPathWithQuery preserves savedView param', () => {
  const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const state = { ...defaultExplorerUrlState(), savedExplorerViewId: id };
  const path = explorerPathWithQuery(state);
  assert.ok(path.includes(`savedView=${id}`));
  const back = parseEventsExplorerSearchParams(Object.fromEntries(new URLSearchParams(path.split('?')[1])));
  assert.equal(back.savedExplorerViewId, id);
});

test('buildEventsExplorerSearchParams omits default sort/order', () => {
  const p = buildEventsExplorerSearchParams(defaultExplorerUrlState());
  assert.equal(p.has('sort'), false);
  assert.equal(p.has('order'), false);
});
