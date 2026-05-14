import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BillingInfo, Company } from '@/types/dashboard';
import { formatLimit } from '@/lib/dashboard/formatters';

interface BillingUsageSectionProps {
  company: Company;
  billingInfo?: BillingInfo;
}

export function BillingUsageSection({ company, billingInfo }: BillingUsageSectionProps) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" aria-hidden />
          Billing & usage
        </CardTitle>
        <CardDescription>Company subscription and current period usage from HyreLog.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!billingInfo ? (
          <p className="text-sm text-muted-foreground">Billing data is not available for this session.</p>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="text-lg font-semibold text-foreground">{billingInfo.planName}</p>
            </div>
            {company.planType === 'TRIAL' && company.trialDaysRemaining != null ? (
              <div>
                <p className="text-sm text-muted-foreground">Trial</p>
                <p className="text-lg font-semibold text-foreground">{company.trialDaysRemaining} days remaining</p>
              </div>
            ) : null}
            {billingInfo.nextInvoiceDate ? (
              <div>
                <p className="text-sm text-muted-foreground">Next invoice</p>
                <p className="text-lg font-semibold text-foreground">{billingInfo.nextInvoiceDate}</p>
              </div>
            ) : null}
            {billingInfo.usage ? (
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">This period</p>
                <p className="text-foreground">
                  Events:{' '}
                  <span className="font-semibold tabular-nums">
                    {billingInfo.usage.eventsIngested.toLocaleString()}
                  </span>{' '}
                  / {formatLimit(billingInfo.limits?.eventsIngested)}
                </p>
                <p className="text-foreground">
                  Exports:{' '}
                  <span className="font-semibold tabular-nums">
                    {billingInfo.usage.exportsCreated.toLocaleString()}
                  </span>{' '}
                  / {formatLimit(billingInfo.limits?.exportsCreated)}
                </p>
                <p className="text-foreground">
                  Webhooks:{' '}
                  <span className="font-semibold tabular-nums">
                    {billingInfo.usage.webhooksActive.toLocaleString()}
                  </span>{' '}
                  / {formatLimit(billingInfo.limits?.webhooksActive)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No usage rows found for the current billing period.</p>
            )}
          </>
        )}
        <Button variant="outline" className="w-full" asChild>
          <Link href="/billing/subscription">Open billing</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
