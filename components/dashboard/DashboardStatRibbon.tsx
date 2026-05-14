'use client';

import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, BarChart3, LayoutGrid, Mail, MapPin, Users, FolderKanban } from 'lucide-react';
import type { Company, Member, Project, Workspace } from '@/types/dashboard';
import type { DashboardHomeInsights, EventVolumeRangeKey } from '@/lib/dashboard/types';
import { formatCompactNumber } from '@/lib/dashboard/formatters';
import { cn } from '@/lib/utils';

type RibbonTileProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  spark?: number[];
  accent: 'indigo' | 'cyan' | 'violet' | 'emerald';
};

const accentRing: Record<RibbonTileProps['accent'], string> = {
  indigo: 'from-indigo-500/30 to-indigo-600/5',
  cyan: 'from-cyan-500/25 to-cyan-600/5',
  violet: 'from-violet-500/25 to-violet-600/5',
  emerald: 'from-emerald-500/25 to-emerald-600/5',
};

function RibbonTile({ label, value, hint, icon: Icon, spark, accent }: RibbonTileProps) {
  const max = spark?.length ? Math.max(1, ...spark) : 1;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-sm',
        'dark:bg-card/50'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r opacity-90',
          accentRing[accent]
        )}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="rounded-xl bg-muted/80 p-2.5 text-foreground/80 dark:bg-muted/40">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      {spark && spark.length > 0 ? (
        <div className="mt-4 flex h-10 items-end gap-0.5" aria-hidden>
          {spark.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-linear-to-t from-indigo-500/20 to-indigo-500/70 dark:from-indigo-400/15 dark:to-indigo-400/60"
              style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function sparkFromHistogram(insights: DashboardHomeInsights, key: EventVolumeRangeKey): number[] | undefined {
  const h = insights.volumeHistograms[key];
  if (!h?.buckets?.length) return undefined;
  const tail = h.buckets.slice(-12).map((b) => b.count);
  return tail.length ? tail : undefined;
}

type DashboardStatRibbonProps = {
  variant: 'company' | 'workspace';
  company: Company;
  workspace?: Workspace;
  workspaces: Workspace[];
  members: Member[];
  projects: Project[];
  insights: DashboardHomeInsights;
};

export function DashboardStatRibbon({
  variant,
  company,
  workspace,
  workspaces,
  members,
  projects,
  insights,
}: DashboardStatRibbonProps) {
  const spark7d = useMemo(() => sparkFromHistogram(insights, '7d'), [insights]);

  const total7d = insights.rangeTotals.find((r) => r.key === '7d')?.total;
  const total24h = insights.rangeTotals.find((r) => r.key === '24h')?.total;

  if (variant === 'company') {
    const pendingInvites = members.filter((m) => m.status === 'PENDING').length;
    const activeMembers = members.filter((m) => m.status === 'ACTIVE').length;
    const mtdSum = workspaces.reduce((acc, w) => {
      if (typeof w.monthlyEvents === 'number' && !Number.isNaN(w.monthlyEvents)) return acc + w.monthlyEvents;
      return acc;
    }, 0);
    const mtdUnknown = workspaces.some((w) => w.monthlyEvents == null);

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RibbonTile
          accent="indigo"
          label="Workspaces"
          value={formatCompactNumber(workspaces.length)}
          hint="Isolated environments for keys & streams"
          icon={LayoutGrid}
          spark={spark7d}
        />
        <RibbonTile
          accent="cyan"
          label="Active members"
          value={formatCompactNumber(activeMembers)}
          hint="People with company access"
          icon={Users}
        />
        <RibbonTile
          accent="violet"
          label="Pending invites"
          value={formatCompactNumber(pendingInvites)}
          hint="Company invites awaiting acceptance"
          icon={Mail}
        />
        <RibbonTile
          accent="emerald"
          label="Events (7d)"
          value={typeof total7d === 'number' ? formatCompactNumber(total7d) : '—'}
          hint={
            typeof total24h === 'number'
              ? `24h: ${formatCompactNumber(total24h)} · MTD sum ${mtdUnknown ? '(partial)' : ''} ${formatCompactNumber(mtdSum)}`
              : 'HyreLog rolling windows (UTC)'
          }
          icon={BarChart3}
        />
      </div>
    );
  }

  const mtd =
    workspace && typeof workspace.monthlyEvents === 'number' && !Number.isNaN(workspace.monthlyEvents)
      ? workspace.monthlyEvents
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <RibbonTile
        accent="indigo"
        label="Projects"
        value={formatCompactNumber(projects.length)}
        hint="Active projects in this workspace"
        icon={FolderKanban}
        spark={spark7d}
      />
      <RibbonTile
        accent="cyan"
        label="Workspace members"
        value={workspace ? formatCompactNumber(workspace.memberCount) : '—'}
        hint="People attached to this workspace"
        icon={Users}
      />
      <RibbonTile
        accent="violet"
        label="Region"
        value={workspace?.region ?? '—'}
        hint="Data plane preference"
        icon={MapPin}
      />
      <RibbonTile
        accent="emerald"
        label="Events (7d)"
        value={typeof total7d === 'number' ? formatCompactNumber(total7d) : '—'}
        hint={
          mtd != null
            ? `MTD (workspace): ${formatCompactNumber(mtd)}`
            : workspace?.monthlyEventsCapped
              ? 'MTD may be capped by the API query'
              : 'HyreLog rolling totals for this scope'
        }
        icon={Activity}
      />
    </div>
  );
}
