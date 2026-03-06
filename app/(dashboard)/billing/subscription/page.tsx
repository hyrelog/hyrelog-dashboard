import { redirect } from 'next/navigation';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getSubscriptionSummary, getUsageSummary, createCheckoutSession, createPortalSession } from '@/actions/billing';
import { BillingContent } from './BillingContent';
import { prisma } from '@/lib/prisma';

export default async function BillingSubscriptionPage() {
  const session = await requireDashboardAccess('/billing/subscription');
  const companyId = (session as { company: { id: string } }).company.id;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  const canManageBilling = ['OWNER', 'ADMIN', 'BILLING'].includes(userRole);

  const [subResult, usageResult] = await Promise.all([
    getSubscriptionSummary(),
    getUsageSummary(),
  ]);

  if (!subResult.ok) redirect('/');
  if (!usageResult.ok) redirect('/');

  const plans = await prisma.plan.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <BillingContent
      subscription={subResult.subscription}
      usage={usageResult.usage}
      plans={plans}
      stripeConfigured={subResult.stripeConfigured}
      canManageBilling={canManageBilling}
      createCheckoutSession={canManageBilling ? createCheckoutSession : undefined}
      createPortalSession={canManageBilling ? createPortalSession : undefined}
    />
  );
}
