import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  className?: string;
  /** When set, the whole card is a link (keyboard + screen reader friendly). */
  drillHref?: string;
  drillAriaLabel?: string;
}

export function MetricCard({ label, value, hint, icon: Icon, className, drillHref, drillAriaLabel }: MetricCardProps) {
  const inner = (
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="rounded-xl bg-brand-500/10 p-2.5 text-brand-600 dark:text-brand-400">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </CardContent>
  );

  return (
    <Card
      className={cn(
        'rounded-2xl border-border/60 bg-card/80 shadow-sm backdrop-blur-sm dark:bg-card/40',
        drillHref && 'transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring',
        className
      )}
    >
      {drillHref ? (
        <Link
          href={drillHref}
          className="block cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={drillAriaLabel ?? `Open details for ${label}`}
        >
          {inner}
        </Link>
      ) : (
        inner
      )}
    </Card>
  );
}
