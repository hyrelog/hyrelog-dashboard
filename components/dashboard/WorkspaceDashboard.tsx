'use client';

import Link from 'next/link';
import { Activity, FolderKanban, KeyRound, Lock, MapPin, Shield, Users } from 'lucide-react';
import { DashboardHeader, type DashboardHeaderQuickAction } from './DashboardHeader';
import { MetricCard } from './MetricCard';
import { EventVolumeChart } from './EventVolumeChart';
import { LiveActivityFeed } from './LiveActivityFeed';
import { TopActionsChart } from './TopActionsChart';
import { EventCategoriesChart } from './EventCategoriesChart';
import { ApiHealthCard } from './ApiHealthCard';
import { IntegrityStatusCard } from './IntegrityStatusCard';
import { EmptyDashboardState } from './EmptyDashboardState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Company, Workspace, Project } from '@/types/dashboard';
import type { DashboardHomeInsights } from '@/lib/dashboard/types';
import { formatCompactNumber } from '@/lib/dashboard/formatters';
import { buildWorkspaceEventsUrl } from '@/lib/dashboard/drilldown';

interface WorkspaceDashboardProps {
  company: Company;
  workspace: Workspace;
  projects: Project[];
  insights: DashboardHomeInsights;
  /** When true, skip the in-card header and the four metric tiles (replaced by the home hero ribbon). */
  embeddedLayout?: boolean;
}

export function WorkspaceDashboard({
  company,
  workspace,
  projects,
  insights,
  embeddedLayout = false,
}: WorkspaceDashboardProps) {
  const explorerHref = buildWorkspaceEventsUrl(workspace.id);
  const drillRange =
    insights.sampleFrom && insights.sampleTo
      ? { from: insights.sampleFrom, to: insights.sampleTo }
      : undefined;
  const range30d = insights.rangeTotals.find((r) => r.key === '30d');
  const mtdExplorerHref =
    range30d && range30d.from && range30d.to
      ? buildWorkspaceEventsUrl(workspace.id, { from: range30d.from, to: range30d.to })
      : explorerHref;
  const workspaceSettingsHref = `/workspaces/${company.slug}-${workspace.slug}`;

  const actions: DashboardHeaderQuickAction[] = [
    { label: 'Event Explorer', href: explorerHref, icon: 'events' },
    { label: 'Workspace keys', href: `/workspaces/${company.slug}-${workspace.slug}`, icon: 'keys' },
  ];

  const sampleFootnote =
    insights.chartDataSources.categories === 'native_histogram_window'
      ? 'Top 5 actions/categories plus “Other” when needed; totals are merged HyreLog histogram buckets for the rolling 7-day window in this workspace.'
      : insights.sampleSize > 0
        ? `Rankings use the latest ${insights.sampleSize} events visible to you in this workspace.${
            insights.topRegions.length > 0
              ? ' Region tags are from the same bounded sample, not a full census.'
              : ''
          }`
        : 'Not enough sampled events in this window yet for category or action rankings.';

  const mtd =
    typeof workspace.monthlyEvents === 'number' && !Number.isNaN(workspace.monthlyEvents)
      ? workspace.monthlyEvents
      : null;

  return (
    <div className="space-y-8">
      {!embeddedLayout ? (
        <>
          <DashboardHeader
            title={workspace.name}
            subtitle="Workspace overview (scoped to your membership)"
            company={company}
            contextLine="Billing and company-wide totals are hidden on this surface by design."
            actions={actions}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Projects" value={formatCompactNumber(projects.length)} icon={FolderKanban} />
            <MetricCard label="Members" value={formatCompactNumber(workspace.memberCount)} icon={Users} />
            <MetricCard label="Region" value={workspace.region} icon={MapPin} hint="Data plane preference" />
            <MetricCard
              label="MTD events"
              value={mtd == null ? '—' : formatCompactNumber(mtd)}
              icon={Activity}
              hint={workspace.monthlyEventsCapped ? 'Count may be capped by the API query used for MTD.' : undefined}
              drillHref={mtd == null ? undefined : mtdExplorerHref}
              drillAriaLabel="Open Event Explorer for this workspace in the past 30 day window"
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
            workspaceDashboardId={workspace.id}
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TopActionsChart
              title="Top actions"
              description="Scoped to this workspace from a bounded sample."
              rows={insights.topActions}
              footnote={sampleFootnote}
              drillRange={drillRange}
              workspaceDashboardId={workspace.id}
              distributionSource={insights.chartDataSources.actions}
            />
            <EventCategoriesChart
              rows={insights.topCategories}
              footnote={sampleFootnote}
              drillRange={drillRange}
              workspaceDashboardId={workspace.id}
              distributionSource={insights.chartDataSources.categories}
            />
          </div>
          <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Projects</CardTitle>
                <CardDescription>Ship configuration per environment.</CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/workspaces/${company.slug}-${workspace.slug}`}>Workspace settings</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <EmptyDashboardState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="Projects are optional. You can still emit workspace-level events while you organize environments."
                  primaryHref={workspaceSettingsHref}
                  primaryLabel="Open workspace"
                  secondary={[
                    { href: explorerHref, label: 'Event Explorer' },
                    { href: '/webhooks', label: 'Webhooks' },
                  ]}
                />
              ) : (
                <ul className="space-y-3">
                  {projects.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.slug}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {p.environment}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <LiveActivityFeed
            events={insights.recentEvents}
            title="Live stream"
            drillSampleRange={drillRange}
            workspaceDashboardId={workspace.id}
          />
          <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5" aria-hidden />
                Security
              </CardTitle>
              <CardDescription>Keep workspace access and credentials tight.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/security">Personal security</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={workspaceSettingsHref}>
                  <span className="inline-flex items-center gap-2">
                    <KeyRound className="h-4 w-4" aria-hidden />
                    Workspace keys & access
                  </span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/webhooks">Company webhooks</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 bg-card/80 shadow-sm dark:bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg">Region & retention</CardTitle>
              <CardDescription>Immutable audit context is scoped to this workspace region.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Preferred region: <span className="font-medium text-foreground">{workspace.region}</span>
              </p>
              <p>
                Retention and export behavior follow your company plan and workspace policies. Confirm details in
                workspace settings and compliance docs—this card does not assert verification status.
              </p>
            </CardContent>
          </Card>
          <ApiHealthCard
            apiConfigured={insights.apiConfigured}
            errorMessage={insights.loadError}
            explorerHref={
              drillRange
                ? buildWorkspaceEventsUrl(workspace.id, drillRange)
                : buildWorkspaceEventsUrl(workspace.id)
            }
            settingsHref={workspaceSettingsHref}
          />
          <IntegrityStatusCard />
        </div>
      </div>

      <Card className="rounded-2xl border-border/60 bg-muted/20 dark:bg-muted/10">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 shrink-0" aria-hidden />
            <span>Preview scoped traffic, then pivot into Event Explorer with filters.</span>
          </div>
          <Button size="sm" variant="secondary" asChild>
            <Link href={explorerHref} className="gap-2">
              <Activity className="h-4 w-4" aria-hidden />
              Open scoped explorer
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
