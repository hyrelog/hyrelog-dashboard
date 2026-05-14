import {
  fetchDashboardHomeInsights,
  getDashboardHomeData,
  isCompanyAdmin,
  resolveDashboardHomeWorkspaceFocus,
} from '@/actions/dashboard';
import { DashboardHomeWithSession } from '@/components/dashboard/DashboardHomeWithSession';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getSubscriptionSummary, getUsageSummary } from '@/actions/billing';
import { shouldAttachBillingToHomeInsights } from '@/lib/dashboard/home-insights-policy';
import { dashboardLog } from '@/lib/dashboard-logger';
import type { CompanyRole } from '@/types/dashboard';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireDashboardAccess('/');
  const sp = await searchParams;
  const rawW = sp.workspace;
  const workspaceQuery = Array.isArray(rawW) ? rawW[0] : rawW;

  const role = session.userCompany.role as CompanyRole;
  const admin = isCompanyAdmin(role);

  const focusWorkspaceDashboardId = await resolveDashboardHomeWorkspaceFocus({
    companyId: session.company.id,
    userId: session.user.id,
    isCompanyAdmin: admin,
    workspaceQuery,
  });

  const homeDataPromise = getDashboardHomeData({
    companyId: session.company.id,
    userId: session.user.id,
    isCompanyAdmin: admin,
    focusWorkspaceDashboardId,
  });

  const insightsBase = {
    companyId: session.company.id,
    userId: session.user.id,
    userEmail: session.user.email ?? '',
    companyRole: role,
    focusWorkspaceDashboardId,
  };

  /**
   * **Performance / isolation**
   * - Company-level roles: `getDashboardHomeData` runs once in parallel with billing summaries, then a **single**
   *   `fetchDashboardHomeInsights` (includes optional `billingInfo` for plan-pressure signals only).
   * - Workspace-only roles: **no** billing server actions; `getDashboardHomeData` and `fetchDashboardHomeInsights`
   *   run in parallel; insights never receive `billingInfo`.
   */
  if (shouldAttachBillingToHomeInsights(role)) {
    const [{ projects, members }, subResult, usageResult] = await Promise.all([
      homeDataPromise,
      getSubscriptionSummary().catch(() => {
        dashboardLog.warn('dashboard_billing_insight_failure', { phase: 'subscription', outcome: 'threw' });
        return { ok: false as const, error: 'unavailable' };
      }),
      getUsageSummary().catch(() => {
        dashboardLog.warn('dashboard_billing_insight_failure', { phase: 'usage', outcome: 'threw' });
        return { ok: false as const, error: 'unavailable' };
      }),
    ]);

    if (!subResult.ok) {
      dashboardLog.warn('dashboard_billing_insight_failure', { phase: 'subscription', outcome: 'not_ok' });
    }
    if (!usageResult.ok) {
      dashboardLog.warn('dashboard_billing_insight_failure', { phase: 'usage', outcome: 'not_ok' });
    }

    const billingInfo = {
      planName: subResult.ok && subResult.subscription ? subResult.subscription.planName : 'Free',
      limits:
        subResult.ok && subResult.subscription
          ? {
              eventsIngested: subResult.subscription.monthlyLimits.eventsIngested,
              exportsCreated: subResult.subscription.monthlyLimits.exportsCreated,
              webhooksActive: subResult.subscription.monthlyLimits.webhooksActive,
            }
          : undefined,
      nextInvoiceDate:
        subResult.ok && subResult.subscription?.currentPeriodEnd
          ? new Date(subResult.subscription.currentPeriodEnd).toLocaleDateString(undefined, {
              dateStyle: 'medium',
            })
          : undefined,
      usage:
        usageResult.ok && usageResult.usage
          ? {
              eventsIngested: usageResult.usage.eventsIngested,
              exportsCreated: usageResult.usage.exportsCreated,
              webhooksActive: usageResult.usage.webhooksActive,
              periodStart: usageResult.usage.periodStart,
              periodEnd: usageResult.usage.periodEnd,
            }
          : undefined,
    };

    const insights = await fetchDashboardHomeInsights({
      ...insightsBase,
      billingInfo,
    });

    return (
      <DashboardHomeWithSession
        projects={projects}
        members={members}
        billingInfo={billingInfo}
        insights={insights}
        workspaceFocusId={focusWorkspaceDashboardId}
      />
    );
  }

  const [{ projects, members }, insights] = await Promise.all([
    homeDataPromise,
    fetchDashboardHomeInsights(insightsBase),
  ]);

  return (
    <DashboardHomeWithSession
      projects={projects}
      members={members}
      insights={insights}
      workspaceFocusId={focusWorkspaceDashboardId}
    />
  );
}
