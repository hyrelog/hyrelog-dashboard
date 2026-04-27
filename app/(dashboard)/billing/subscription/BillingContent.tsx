'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SubscriptionSummary, UsageSummary } from '@/actions/billing';
import type { Plan } from '@/generated/prisma/client';
import { CreditCard, Loader2 } from 'lucide-react';

type BillingContentProps = {
  subscription: SubscriptionSummary | null;
  usage: UsageSummary | null;
  plans: Plan[];
  stripeConfigured: boolean;
  canManageBilling: boolean;
  createCheckoutSession?: (priceId: string) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
  createPortalSession?: () => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
};

export function BillingContent({
  subscription,
  usage,
  plans,
  stripeConfigured,
  canManageBilling,
  createCheckoutSession,
  createPortalSession,
}: BillingContentProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (priceId: string) => {
    if (!createCheckoutSession || !priceId) return;
    setLoading('checkout');
    setError(null);
    const result = await createCheckoutSession(priceId);
    setLoading(null);
    if (result.ok) {
      window.location.href = result.url;
    } else {
      setError(result.error);
    }
  };

  const handleManageBilling = async () => {
    if (!createPortalSession) return;
    setLoading('portal');
    setError(null);
    const result = await createPortalSession();
    setLoading(null);
    if (result.ok) {
      window.location.href = result.url;
    } else {
      setError(result.error);
    }
  };

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : null;

  return (
    <div className="p-4 sm:p-6">
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing &amp; subscription</h1>
        <p className="text-muted-foreground">
          Manage your plan, usage, and billing details.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current plan
          </CardTitle>
          <CardDescription>
            {subscription
              ? `You are on the ${subscription.planName} plan.`
              : 'No active subscription. You are on the default plan.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription && (
            <ul className="text-sm space-y-1">
              <li>Plan: <strong>{subscription.planName}</strong></li>
              <li>Status: <strong>{subscription.status}</strong></li>
              {periodEnd && <li>Next billing date: {periodEnd}</li>}
              {subscription.cancelAtPeriodEnd && (
                <li className="text-amber-600">Subscription will cancel at the end of the current period.</li>
              )}
              {subscription.trialEndsAt && (
                <li>Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</li>
              )}
            </ul>
          )}
          {stripeConfigured && canManageBilling && subscription?.stripeCustomerId && (
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={loading !== null}
            >
              {loading === 'portal' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Manage billing (Stripe portal)
            </Button>
          )}
        </CardContent>
      </Card>

      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage this period</CardTitle>
            <CardDescription>
              Period: {new Date(usage.periodStart).toLocaleDateString()} to {new Date(usage.periodEnd).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>Events ingested: <strong>{usage.eventsIngested.toLocaleString()}</strong></li>
              <li>Exports created: <strong>{usage.exportsCreated}</strong></li>
              <li>Webhooks active: <strong>{usage.webhooksActive}</strong></li>
            </ul>
          </CardContent>
        </Card>
      )}

      {stripeConfigured && canManageBilling && plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plans</CardTitle>
            <CardDescription>Upgrade or change your plan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const priceId = (plan as Plan & { stripePriceMonthlyId?: string }).stripePriceMonthlyId;
                const isCurrent = subscription?.planCode === plan.code;
                return (
                  <div
                    key={plan.id}
                    className="rounded-lg border p-4 flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{plan.description ?? ''}</p>
                    </div>
                    {priceId && !isCurrent && (
                      <Button
                        className="mt-3"
                        size="sm"
                        onClick={() => handleUpgrade(priceId)}
                        disabled={loading !== null}
                      >
                        {loading === 'checkout' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Upgrade
                      </Button>
                    )}
                    {isCurrent && (
                      <p className="text-xs text-muted-foreground mt-3">Current plan</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!stripeConfigured && (
        <p className="text-sm text-muted-foreground">
          Billing is not configured. Set STRIPE_SECRET_KEY and create products in Stripe to enable upgrades.
        </p>
      )}
      </div>
    </div>
  );
}
