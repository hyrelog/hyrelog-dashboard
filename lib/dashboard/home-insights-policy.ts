import type { CompanyRole } from '@/types/dashboard';
import { isCompanyLevelRole } from '@/lib/dashboard/types';

/** Company-level roles may load subscription/usage for billing pressure insights on the home dashboard. */
export function shouldAttachBillingToHomeInsights(companyRole: CompanyRole): boolean {
  return isCompanyLevelRole(companyRole);
}

/**
 * When true, HyreLog list/histogram calls should include `workspaceId` (API id).
 * Company-wide roles use company scope in HyreLog without a workspace filter unless narrowed elsewhere.
 */
export function shouldScopeHyreLogEventsToWorkspaceApiId(
  companyRole: CompanyRole,
  workspaceApiId: string | undefined
): boolean {
  return !isCompanyLevelRole(companyRole) && Boolean(workspaceApiId);
}

/** Prisma-backed home project list: admins see all company workspaces; others see only memberships. */
export function homeProjectListWorkspaceSource(isCompanyAdmin: boolean): 'company_all_workspaces' | 'user_workspace_memberships' {
  return isCompanyAdmin ? 'company_all_workspaces' : 'user_workspace_memberships';
}
