'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Activity, FolderKanban, LayoutGrid, Mail, Users, BarChart3, Shield } from 'lucide-react';
import { DashboardHeader, type DashboardHeaderQuickAction } from './DashboardHeader';
import { MetricCard } from './MetricCard';
import { EventVolumeChart } from './EventVolumeChart';
import { LiveActivityFeed } from './LiveActivityFeed';
import { WorkspaceHeatmap } from './WorkspaceHeatmap';
import { WorkspaceDrilldownTable } from './WorkspaceDrilldownTable';
import { IntegrityStatusCard } from './IntegrityStatusCard';
import { TopActionsChart } from './TopActionsChart';
import { EventCategoriesChart } from './EventCategoriesChart';
import { BillingUsageSection } from './BillingUsageSection';
import { ApiHealthCard } from './ApiHealthCard';
import { EmptyDashboardState } from './EmptyDashboardState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Company, Workspace, Member, BillingInfo } from '@/types/dashboard';
import type { DashboardHomeInsights } from '@/lib/dashboard/types';
import { formatCompactNumber } from '@/lib/dashboard/formatters';
import { buildEventExplorerUrl } from '@/lib/dashboard/drilldown';

const TEAM_PREVIEW_LIMIT = 5;

function memberDisplayName(member: Member): string {
  const parts = [member.firstName, member.lastName].filter((s) => s && String(s).trim());
  if (parts.length > 0) return parts.join(' ').trim();
  return member.email;
}

function memberInitials(member: Member): string {
  const name = memberDisplayName(member);
  if (name.includes('@')) {
    const local = name.split('@')[0] ?? name;
    return local.slice(0, 2).toUpperCase();
  }
  const bits = name.split(/\s+/).filter(Boolean);
  if (bits.length >= 2) {
    const a = bits[0][0];
    const b = bits[bits.length - 1][0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '—';
}

function formatMemberRole(role: Member['role']): string {
  if (role === 'OWNER') return 'Owner';
  if (role === 'ADMIN') return 'Admin';
  if (role === 'BILLING') return 'Billing';
  return 'Member';
}

interface CompanyDashboardProps {
  company: Company;
  workspaces: Workspace[];
  members: Member[];
  billingInfo?: BillingInfo;
  insights: DashboardHomeInsights;
  /** When true, skip the in-card header and the four metric tiles (replaced by the home hero ribbon). */
  embeddedLayout?: boolean;
}

export function CompanyDashboard({
  company,
  workspaces,
  members,
  billingInfo,
  insights,
  embeddedLayout = false,
}: CompanyDashboardProps) {
  const pendingInvites = members.filter((m) => m.status === 'PENDING').length;
  const activeMembers = members.filter((m) => m.status === 'ACTIVE').length;
  const drillRange =
    insights.sampleFrom && insights.sampleTo
      ? { from: insights.sampleFrom, to: insights.sampleTo }
      : undefined;
  const range30d = insights.rangeTotals.find((r) => r.key === '30d');
  const mtdExplorerHref =
    range30d && range30d.from && range30d.to
      ? buildEventExplorerUrl({ from: range30d.from, to: range30d.to })
      : buildEventExplorerUrl({});
  const mtdSum = workspaces.reduce((acc, w) => {
    if (typeof w.monthlyEvents === 'number' && !Number.isNaN(w.monthlyEvents)) return acc + w.monthlyEvents;
    return acc;
  }, 0);
  const mtdUnknown = workspaces.some((w) => w.monthlyEvents == null);

  const activeMemberList = useMemo(
    () =>
      members
        .filter((m) => m.status === 'ACTIVE')
        .sort((a, b) => memberDisplayName(a).localeCompare(memberDisplayName(b), undefined, { sensitivity: 'base' })),
    [members]
  );

  const previewMembers = activeMemberList.slice(0, TEAM_PREVIEW_LIMIT);
  const extraActiveCount = Math.max(0, activeMemberList.length - previewMembers.length);

  const actions: DashboardHeaderQuickAction[] = [
    { label: 'Event Explorer', href: '/events', icon: 'events' },
    { label: 'Workspaces', href: '/workspaces', icon: 'workspace' },
    { label: 'API & keys', href: '/company-settings/api-access', icon: 'keys' },
  ];

  const sampleFootnote =
    insights.chartDataSources.categories === 'native_histogram_window'
      ? 'Top 5 categories plus “Other” when needed; totals are merged HyreLog histogram buckets for the rolling 7-day window.'
      : insights.sampleSize > 0
        ? `Rankings use the latest ${insights.sampleSize} events from the HyreLog API in the sampled window (not full history).${
            insights.topRegions.length > 0
              ? ' Region tags come from the same bounded sample, not a full geographic census.'
              : ''
          }`
        : 'Not enough sampled events in this window yet for category or action rankings.';

  if (workspaces.length === 0) {
    return (
      <div className="space-y-6">
        {!embeddedLayout ? (
          <DashboardHeader
            title={company.name}
            subtitle="Company overview"
            company={company}
            planLabel={billingInfo?.planName}
            contextLine="Rolling windows for charts are evaluated in UTC on the server."
            actions={actions}
          />
        ) : null}
        <EmptyDashboardState
          icon={FolderKanban}
          title="Create your first workspace"
          description="Workspaces isolate projects, keys, and event streams. You need at least one workspace before ingestion and explorer traffic appear here."
          primaryHref="/workspaces"
          primaryLabel="Go to workspaces"
          secondary={[
            { href: '/events', label: 'Event Explorer' },
            { href: '/company-settings/api-access', label: 'API access' },
            { href: '/webhooks', label: 'Webhooks' },
            { href: '/billing/subscription', label: 'Billing' },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ApiHealthCard
            apiConfigured={insights.apiConfigured}
            errorMessage={insights.loadError}
            explorerHref={drillRange ? buildEventExplorerUrl(drillRange) : buildEventExplorerUrl({})}
            settingsHref="/company-settings/api-access"
          />
          <BillingUsageSection company={company} billingInfo={billingInfo} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!embeddedLayout ? (
        <>
          <DashboardHeader
            title={company.name}
            subtitle="Company overview"
            company={company}
            planLabel={billingInfo?.planName}
            contextLine="Rolling windows for charts are evaluated in UTC on the server."
            actions={actions}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Workspaces" value={formatCompactNumber(workspaces.length)} icon={LayoutGrid} />
            <MetricCard label="Active members" value={formatCompactNumber(activeMembers)} icon={Users} />
            <MetricCard
              label="Pending invites"
              value={formatCompactNumber(pendingInvites)}
              icon={Mail}
              hint="Company invites awaiting acceptance"
            />
            <MetricCard
              label="MTD events (sum)"
              value={mtdUnknown && mtdSum === 0 ? '—' : formatCompactNumber(mtdSum)}
              icon={BarChart3}
              hint={mtdUnknown ? 'Some workspaces missing MTD totals from HyreLog.' : 'Sum of per-workspace month-to-date totals'}
              drillHref={mtdExplorerHref}
              drillAriaLabel="Open Event Explorer for the past 30 day window"
            />
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <EventVolumeChart
            rangeTotals={insights.rangeTotals}
            volumeHistograms={insights.volumeHistograms}
            volumeHistogramsPartial={insights.volumeHistogramsPartial}
            eventVolumeHistogramSource={insights.eventVolumeHistogramSource}
            note={insights.volumeChartNote}
            apiConfigured={insights.apiConfigured}
          />
          <WorkspaceHeatmap
            workspaces={workspaces}
            drillRange={drillRange}
            events7dByWorkspaceId={insights.workspaceEvents7dByDashboardId}
          />
          <WorkspaceDrilldownTable companySlug={company.slug} workspaces={workspaces} drillRange={drillRange} />
        </div>
        <div className="space-y-6">
          <LiveActivityFeed events={insights.recentEvents} drillSampleRange={drillRange} />
          <ApiHealthCard
            apiConfigured={insights.apiConfigured}
            errorMessage={insights.loadError}
            explorerHref={drillRange ? buildEventExplorerUrl(drillRange) : buildEventExplorerUrl({})}
            settingsHref="/company-settings/api-access"
          />
          <IntegrityStatusCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopActionsChart
          title="Top actions"
          description="Distribution from a bounded recent sample (not billing usage)."
          rows={insights.topActions}
          footnote={sampleFootnote}
          drillRange={drillRange}
          distributionSource={insights.chartDataSources.actions}
        />
        <EventCategoriesChart
          rows={insights.topCategories}
          footnote={sampleFootnote}
          drillRange={drillRange}
          distributionSource={insights.chartDataSources.categories}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BillingUsageSection company={company} billingInfo={billingInfo} />
        <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" aria-hidden />
              Team directory
            </CardTitle>
            <CardDescription>Manage membership and workspace access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {activeMembers} active · {pendingInvites} pending
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/company/members">Members</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/company/invites">Invites</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/webhooks">Webhooks</Link>
              </Button>
            </div>

            {previewMembers.length > 0 ? (
              <div className="space-y-2 border-t border-border/60 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent</p>
                <ul className="space-y-2">
                  {previewMembers.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 dark:bg-muted/10"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                        aria-hidden
                      >
                        {memberInitials(m)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{memberDisplayName(m)}</p>
                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {formatMemberRole(m.role)}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {extraActiveCount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    <Link href="/company/members" className="font-medium text-foreground underline-offset-4 hover:underline">
                      View all {formatCompactNumber(activeMemberList.length)} members
                    </Link>
                    {' · '}
                    showing {formatCompactNumber(previewMembers.length)}
                  </p>
                ) : null}
              </div>
            ) : pendingInvites > 0 ? (
              <div className="border-t border-border/60 pt-4">
                <p className="text-sm text-muted-foreground">
                  No active members listed yet.{' '}
                  <Link href="/company/invites" className="font-medium text-foreground underline-offset-4 hover:underline">
                    {formatCompactNumber(pendingInvites)} pending invite{pendingInvites === 1 ? '' : 's'}
                  </Link>
                </p>
              </div>
            ) : (
              <div className="border-t border-border/60 pt-4">
                <p className="text-sm text-muted-foreground">No company members yet. Invite people from Invites.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60 bg-muted/20 dark:bg-muted/10">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            <span>Need deeper forensics? Use Event Explorer with workspace filters and immutable exports.</span>
          </div>
          <Button size="sm" variant="secondary" asChild>
            <Link href="/events" className="gap-2">
              <Activity className="h-4 w-4" aria-hidden />
              Open Event Explorer
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
