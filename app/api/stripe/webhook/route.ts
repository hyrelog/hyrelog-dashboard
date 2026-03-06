/**
 * Stripe webhook handler. Syncs subscription status, period, and plan to Dashboard DB.
 * Verify signature with STRIPE_WEBHOOK_SECRET. Forward with: stripe listen --forward-to localhost:4000/api/stripe/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeWebhookSecret, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 501 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const secret = getStripeWebhookSecret();
    event = Stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.dashboardCompanyId;
        if (!companyId) break;

        const plan = await prisma.plan.findFirst({
          where: {
            OR: [
              { stripePriceMonthlyId: sub.items.data[0]?.price?.id ?? undefined },
              { stripePriceYearlyId: sub.items.data[0]?.price?.id ?? undefined },
            ],
          },
        });
        const freePlan = await prisma.plan.findFirst({ where: { code: 'FREE' } });
        const planId = plan?.id ?? freePlan?.id;
        if (!planId) {
          console.error('Stripe webhook: no plan found for subscription, skipping');
          break;
        }

        // Stripe types do not currently expose all timestamp fields we need,
        // so read them via a narrow any cast.
        const rawSub = sub as unknown as {
          current_period_start?: number | null;
          current_period_end?: number | null;
          cancel_at_period_end?: boolean | null;
          trial_end?: number | null;
        };

        const currentPeriodStartSeconds = rawSub.current_period_start ?? null;
        const currentPeriodEndSeconds = rawSub.current_period_end ?? null;
        const cancelAtPeriodEnd = rawSub.cancel_at_period_end ?? false;
        const trialEndSeconds = rawSub.trial_end ?? null;

        await prisma.subscription.upsert({
          where: { companyId },
          create: {
            companyId,
            planId,
            status: sub.status === 'active' ? 'ACTIVE' : sub.status === 'trialing' ? 'TRIALING' : 'PAST_DUE',
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price?.id ?? null,
            currentPeriodStart: currentPeriodStartSeconds ? new Date(currentPeriodStartSeconds * 1000) : null,
            currentPeriodEnd: currentPeriodEndSeconds ? new Date(currentPeriodEndSeconds * 1000) : null,
            cancelAtPeriodEnd,
            trialEndsAt: trialEndSeconds ? new Date(trialEndSeconds * 1000) : null,
          },
          update: {
            status:
              sub.status === 'active'
                ? 'ACTIVE'
                : sub.status === 'trialing'
                  ? 'TRIALING'
                  : sub.status === 'past_due'
                    ? 'PAST_DUE'
                    : 'CANCELED',
            stripePriceId: sub.items.data[0]?.price?.id ?? undefined,
            currentPeriodStart: currentPeriodStartSeconds ? new Date(currentPeriodStartSeconds * 1000) : undefined,
            currentPeriodEnd: currentPeriodEndSeconds ? new Date(currentPeriodEndSeconds * 1000) : undefined,
            cancelAtPeriodEnd,
            trialEndsAt: trialEndSeconds ? new Date(trialEndSeconds * 1000) : undefined,
          },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.dashboardCompanyId;
        if (!companyId) break;

        await prisma.subscription.updateMany({
          where: { companyId },
          data: {
            status: 'CANCELED',
            stripeSubscriptionId: null,
            stripePriceId: null,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
