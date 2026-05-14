import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  homeProjectListWorkspaceSource,
  shouldAttachBillingToHomeInsights,
  shouldScopeHyreLogEventsToWorkspaceApiId,
} from '../lib/dashboard/home-insights-policy';

describe('home-insights-policy', () => {
  it('shouldAttachBillingToHomeInsights is true for company-level roles only', () => {
    assert.equal(shouldAttachBillingToHomeInsights('OWNER'), true);
    assert.equal(shouldAttachBillingToHomeInsights('ADMIN'), true);
    assert.equal(shouldAttachBillingToHomeInsights('BILLING'), true);
    assert.equal(shouldAttachBillingToHomeInsights('MEMBER'), false);
  });

  it('shouldScopeHyreLogEventsToWorkspaceApiId is true only for workspace members with an API id', () => {
    assert.equal(shouldScopeHyreLogEventsToWorkspaceApiId('MEMBER', 'api-ws-1'), true);
    assert.equal(shouldScopeHyreLogEventsToWorkspaceApiId('MEMBER', undefined), false);
    assert.equal(shouldScopeHyreLogEventsToWorkspaceApiId('OWNER', 'api-ws-1'), false);
  });

  it('homeProjectListWorkspaceSource distinguishes admin vs member listing', () => {
    assert.equal(homeProjectListWorkspaceSource(true), 'company_all_workspaces');
    assert.equal(homeProjectListWorkspaceSource(false), 'user_workspace_memberships');
  });
});
