'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getStripe, isStripeConfigured } from '@/lib/stripe';

export type SubscriptionSummary = {
  planCode: string;
  planName: string;
  monthlyLimits: {
    eventsIngested: number | null;
    exportsCreated: number | null;
    webhooksActive: number | null;
  };
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
};

export type UsageSummary = {
  eventsIngested: number;
  exportsCreated: number;
  webhooksActive: number;
  periodStart: string;
  periodEnd: string;
};

export async function getSubscriptionSummary(): Promise<{
  ok: true;
  subscription: SubscriptionSummary | null;
  stripeConfigured: boolean;
} | { ok: false; error: string }> {
  const parseMonthlyLimits = (
    entitlements: unknown
  ): { eventsIngested: number | null; exportsCreated: number | null; webhooksActive: number | null } => {
    if (!entitlements || typeof entitlements !== 'object') {
      return { eventsIngested: null, exportsCreated: null, webhooksActive: null };
    }
    const limits = (entitlements as { limits?: Record<string, unknown> }).limits;
    if (!limits || typeof limits !== 'object') {
      return { eventsIngested: null, exportsCreated: null, webhooksActive: null };
    }
    const toNullableNumber = (v: unknown): number | null => (typeof v === 'number' ? v : null);
    return {
      eventsIngested: toNullableNumber((limits as Record<string, unknown>).eventsPerMonth),
      exportsCreated: toNullableNumber((limits as Record<string, unknown>).exportsPerMonth),
      webhooksActive: toNullableNumber((limits as Record<string, unknown>).webhooks),
    };
  };

  const session = await requireDashboardAccess('/billing/subscription');
  const companyId = (session as { company: { id: string } }).company.id;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      subscription: { include: { plan: true } },
    },
  });

  if (!company?.subscription) {
    return {
      ok: true,
      subscription: null,
      stripeConfigured: isStripeConfigured(),
    };
  }

  const sub = company.subscription;
  return {
    ok: true,
    subscription: {
      planCode: sub.plan.code,
      planName: sub.plan.name,
      monthlyLimits: parseMonthlyLimits(sub.plan.baseEntitlements),
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      stripeCustomerId: sub.stripeCustomerId,
    },
    stripeConfigured: isStripeConfigured(),
  };
}

export async function getUsageSummary(): Promise<{
  ok: true;
  usage: UsageSummary | null;
} | { ok: false; error: string }> {
  const session = await requireDashboardAccess('/billing/subscription');
  const companyId = (session as { company: { id: string } }).company.id;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: true },
  });

  if (!company) {
    return { ok: false, error: 'Company not found' };
  }

  const sub = company.subscription;
  const periodStart = sub?.currentPeriodStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = sub?.currentPeriodEnd ?? new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);

  const period = await prisma.usagePeriod.findUnique({
    where: {
      companyId_periodStart: { companyId, periodStart },
    },
  });

  return {
    ok: true,
    usage: {
      eventsIngested: period?.eventsIngested ?? 0,
      exportsCreated: period?.exportsCreated ?? 0,
      webhooksActive: period?.webhooksActive ?? 0,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
  };
}

export async function createCheckoutSession(priceId: string): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const session = await requireDashboardAccess('/billing/subscription');
  const companyId = (session as { company: { id: string } }).company.id;
  const userEmail = (session.user as { email?: string }).email;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  if (!['OWNER', 'ADMIN', 'BILLING'].includes(userRole)) {
    return { ok: false, error: 'Only owners, admins, and billing managers can change plan.' };
  }

  if (!isStripeConfigured()) {
    return { ok: false, error: 'Billing is not configured.' };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: true },
  });
  if (!company) return { ok: false, error: 'Company not found' };

  const stripe = getStripe();
  let customerId = company.subscription?.stripeCustomerId ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail ?? undefined,
      metadata: { dashboardCompanyId: companyId },
    });
    customerId = customer.id;
    await prisma.subscription.updateMany({
      where: { companyId },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
  const sessionStripe = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing/subscription?success=1`,
    cancel_url: `${origin}/billing/subscription?canceled=1`,
    metadata: { dashboardCompanyId: companyId },
    subscription_data: {
      trial_period_days: company.subscription?.status === 'TRIALING' ? undefined : undefined,
    },
  });

  const url = sessionStripe.url;
  if (!url) return { ok: false, error: 'Failed to create checkout session' };
  return { ok: true, url };
}

export async function createPortalSession(): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  const session = await requireDashboardAccess('/billing/subscription');
  const companyId = (session as { company: { id: string } }).company.id;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  if (!['OWNER', 'ADMIN', 'BILLING'].includes(userRole)) {
    return { ok: false, error: 'Only owners, admins, and billing managers can manage billing.' };
  }

  if (!isStripeConfigured()) {
    return { ok: false, error: 'Billing is not configured.' };
  }

  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    select: { stripeCustomerId: true },
  });
  if (!sub?.stripeCustomerId) {
    return { ok: false, error: 'No billing customer found. Subscribe to a plan first.' };
  }

  const origin = (await headers()).get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
  const portal = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${origin}/billing/subscription`,
  });

  if (!portal.url) return { ok: false, error: 'Failed to create portal session' };
  return { ok: true, url: portal.url };
}
