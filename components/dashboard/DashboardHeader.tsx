import Link from 'next/link';
import { Activity, KeyRound, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Company } from '@/types/dashboard';

export type DashboardHeaderQuickAction = {
  label: string;
  href: string;
  icon: 'events' | 'workspace' | 'keys';
};

const iconMap = {
  events: Activity,
  workspace: LayoutGrid,
  keys: KeyRound
} as const;

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  company?: Company;
  planLabel?: string;
  /** Shown as context (e.g. rolling windows are based on server time). */
  contextLine?: string;
  actions?: DashboardHeaderQuickAction[];
  className?: string;
}

export function DashboardHeader({
  title,
  subtitle,
  company,
  planLabel,
  contextLine,
  actions = [],
  className
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 rounded-2xl border border-border/60 bg-linear-to-br from-card via-card to-muted/30 p-6 shadow-sm dark:from-card/80 dark:via-card/60 dark:to-muted/10',
        className
      )}
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
            {planLabel ? (
              <Badge variant="secondary" className="font-normal">
                {planLabel}
              </Badge>
            ) : null}
            {company?.planType === 'TRIAL' && company.trialDaysRemaining != null ? (
              <Badge variant="outline" className="font-normal">
                Trial · {company.trialDaysRemaining}d left
              </Badge>
            ) : null}
          </div>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          {contextLine ? <p className="text-xs text-muted-foreground">{contextLine}</p> : null}
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => {
              const Icon = iconMap[a.icon];
              return (
                <Button key={`${a.href}-${a.label}`} variant="secondary" size="sm" asChild className="shadow-sm">
                  <Link href={a.href} className="gap-2">
                    <Icon className="h-4 w-4" aria-hidden />
                    {a.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
