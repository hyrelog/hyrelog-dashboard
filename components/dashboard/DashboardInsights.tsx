'use client';

import Link from 'next/link';
import { ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react';
import type { DashboardInsightItem, DashboardPeriodComparison } from '@/lib/dashboard/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function severityStyles(sev: DashboardInsightItem['severity']): string {
  switch (sev) {
    case 'positive':
      return 'border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-400/30';
    case 'warning':
      return 'border-amber-500/40 bg-amber-500/5 dark:border-amber-400/30';
    default:
      return 'border-border/60 bg-muted/20';
  }
}

function PeriodComparisonStrip({ pc }: { pc: DashboardPeriodComparison | null }) {
  if (!pc) return null;
  const fmt = (v: number | null) => (v == null ? 'n/a' : `${v > 0 ? '+' : ''}${v}%`);
  return (
    <p className="text-xs text-muted-foreground" role="status">
      vs previous equivalent window — 24h: {fmt(pc.pctChange24h)} · 7d: {fmt(pc.pctChange7d)} (HyreLog headline
      totals)
    </p>
  );
}

function InsightList({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof Lightbulb;
  items: DashboardInsightItem[];
  empty: string;
}) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>Grounded in HyreLog data available to this session—no synthetic anomalies.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => {
            const inner = (
              <>
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </>
            );
            const cardClass = cn(
              'rounded-xl border p-4 text-left transition-colors hover:bg-muted/30',
              severityStyles(item.severity)
            );
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(cardClass, 'block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring')}
                  aria-label={item.ariaLabel ?? item.title}
                >
                  {inner}
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    View <ArrowRight className="h-3 w-3" aria-hidden />
                  </span>
                </Link>
              );
            }
            return (
              <div key={item.id} className={cardClass}>
                {inner}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardInsightsProps {
  highlights: DashboardInsightItem[];
  needsAttention: DashboardInsightItem[];
  periodComparison: DashboardPeriodComparison | null;
}

export function DashboardInsights({ highlights, needsAttention, periodComparison }: DashboardInsightsProps) {
  return (
    <div className="space-y-3">
      <PeriodComparisonStrip pc={periodComparison} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InsightList
          title="Highlights"
          icon={Lightbulb}
          items={highlights}
          empty="Not enough history yet for automated highlights."
        />
        <InsightList
          title="Needs attention"
          icon={AlertTriangle}
          items={needsAttention}
          empty="Nothing flagged right now."
        />
      </div>
    </div>
  );
}
