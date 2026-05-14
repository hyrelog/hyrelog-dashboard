import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildActionDrilldownUrl,
  buildCategoryDrilldownUrl,
  buildEventExplorerUrl,
  buildWorkspaceEventsUrl,
} from '../lib/dashboard/drilldown';

const range = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-08T00:00:00.000Z' };

describe('drilldown', () => {
  it('buildWorkspaceEventsUrl always scopes workspaceId in query', () => {
    const ws = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const u = buildWorkspaceEventsUrl(ws, range);
    assert.match(u, new RegExp(`[?&]workspaceId=${ws}`));
    assert.ok(u.startsWith('/events?'));
  });

  it('buildEventExplorerUrl omits workspace for company-wide explorer', () => {
    const u = buildEventExplorerUrl(range);
    assert.ok(!u.includes('workspaceId'));
  });

  it('action drilldown preserves workspace scoping when dashboard workspace id is set', () => {
    const ws = '11111111-2222-3333-4444-555555555555';
    const u = buildActionDrilldownUrl('user.login', range, ws);
    assert.ok(u.includes(`workspaceId=${ws}`));
    assert.ok(u.includes('action='));
  });

  it('category drilldown preserves workspace scoping when dashboard workspace id is set', () => {
    const ws = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const u = buildCategoryDrilldownUrl('auth', range, ws);
    assert.ok(u.includes(`workspaceId=${ws}`));
    assert.ok(u.includes('category='));
  });
});
