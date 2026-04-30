import { getDashboardHomeData, isCompanyAdmin } from '@/actions/dashboard';
import { DashboardHomeWithSession } from '@/components/dashboard/DashboardHomeWithSession';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getSubscriptionSummary, getUsageSummary } from '@/actions/billing';

export default async function HomePage() {
  const session = await requireDashboardAccess('/');

  const role = session.userCompany.role;
  const admin = isCompanyAdmin(role);

  const [subResult, usageResult, { projects, members }] = await Promise.all([
    getSubscriptionSummary(),
    getUsageSummary(),
    getDashboardHomeData({
      companyId: session.company.id,
      userId: session.user.id,
      isCompanyAdmin: admin
    })
  ]);

  const billingInfo = {
    planName: subResult.ok && subResult.subscription ? subResult.subscription.planName : 'Free',
    limits: subResult.ok && subResult.subscription
      ? {
          eventsIngested: subResult.subscription.monthlyLimits.eventsIngested,
          exportsCreated: subResult.subscription.monthlyLimits.exportsCreated,
          webhooksActive: subResult.subscription.monthlyLimits.webhooksActive,
        }
      : undefined,
    nextInvoiceDate: subResult.ok && subResult.subscription?.currentPeriodEnd
      ? new Date(subResult.subscription.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'medium' })
      : undefined,
    usage: usageResult.ok && usageResult.usage
      ? {
          eventsIngested: usageResult.usage.eventsIngested,
          exportsCreated: usageResult.usage.exportsCreated,
          webhooksActive: usageResult.usage.webhooksActive,
          periodStart: usageResult.usage.periodStart,
          periodEnd: usageResult.usage.periodEnd,
        }
      : undefined,
  };

  return (
    <DashboardHomeWithSession
      projects={projects}
      members={members}
      billingInfo={billingInfo}
    />
  );
}
