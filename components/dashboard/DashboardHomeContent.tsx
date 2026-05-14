'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { KeyRound, LayoutGrid } from 'lucide-react';
import { CompanyDashboard } from './CompanyDashboard';
import { WorkspaceDashboard } from './WorkspaceDashboard';
import { EmptyDashboardState } from './EmptyDashboardState';
import { DashboardScopeBar } from './DashboardScopeBar';
import { DashboardStatRibbon } from './DashboardStatRibbon';
import type { Company, Workspace, Project, Member, BillingInfo } from '@/types/dashboard';
import type { DashboardHomeInsights } from '@/lib/dashboard/types';
import { FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWorkspaceEventsUrl } from '@/lib/dashboard/drilldown';

interface DashboardHomeContentProps {
  company: Company;
  workspaces: Workspace[];
  projects: Project[];
  members: Member[];
  billingInfo?: BillingInfo;
  isCompanyAdmin: boolean;
  insights: DashboardHomeInsights;
  workspaceFocusId: string | null;
}

function ScopeBarFallback() {
  return <div className="h-40 animate-pulse rounded-2xl bg-muted/60" aria-hidden />;
}

export function DashboardHomeContent({
  company,
  workspaces,
  projects,
  members,
  billingInfo,
  isCompanyAdmin,
  insights,
  workspaceFocusId,
}: DashboardHomeContentProps) {
  const sortedWorkspaces = [...workspaces].sort((a, b) => a.name.localeCompare(b.name));
  const defaultWorkspace = sortedWorkspaces[0];

  if (!isCompanyAdmin && !defaultWorkspace) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyDashboardState
          icon={FolderKanban}
          title="No workspace access"
          description="You are signed in, but no workspace has been assigned yet. Ask a company admin to add you to a workspace."
          primaryHref="/help"
          primaryLabel="View help"
        />
      </div>
    );
  }

  const showCompanyHome = isCompanyAdmin && !workspaceFocusId;
  const focusedWorkspace =
    !showCompanyHome && workspaceFocusId ? sortedWorkspaces.find((w) => w.id === workspaceFocusId) : undefined;
  const workspaceForView = showCompanyHome ? undefined : focusedWorkspace ?? defaultWorkspace;

  const workspaceProjects = workspaceForView
    ? projects.filter((p) => p.workspaceId === workspaceForView.id)
    : [];

  const planLabel = billingInfo?.planName;

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <Suspense fallback={<ScopeBarFallback />}>
        <DashboardScopeBar
          company={company}
          workspaces={sortedWorkspaces}
          isCompanyAdmin={isCompanyAdmin}
          workspaceFocusId={workspaceFocusId}
          planLabel={planLabel}
        />
      </Suspense>

      <div className="flex flex-wrap gap-2">
        {showCompanyHome ? (
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/events">Event Explorer</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/workspaces">
                <span className="inline-flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" aria-hidden />
                  Workspaces
                </span>
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/company-settings/api-access">
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="h-4 w-4" aria-hidden />
                  API & keys
                </span>
              </Link>
            </Button>
          </>
        ) : workspaceForView ? (
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href={buildWorkspaceEventsUrl(workspaceForView.id)}>Event Explorer</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/workspaces/${company.slug}-${workspaceForView.slug}`}>
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="h-4 w-4" aria-hidden />
                  Workspace keys
                </span>
              </Link>
            </Button>
          </>
        ) : null}
      </div>

      {showCompanyHome ? (
        <DashboardStatRibbon
          variant="company"
          company={company}
          workspaces={sortedWorkspaces}
          members={members}
          projects={projects}
          insights={insights}
        />
      ) : workspaceForView ? (
        <DashboardStatRibbon
          variant="workspace"
          company={company}
          workspace={workspaceForView}
          workspaces={sortedWorkspaces}
          members={members}
          projects={workspaceProjects}
          insights={insights}
        />
      ) : null}

      {showCompanyHome ? (
        <CompanyDashboard
          company={company}
          workspaces={sortedWorkspaces}
          members={members}
          billingInfo={billingInfo}
          insights={insights}
          embeddedLayout
        />
      ) : workspaceForView ? (
        <WorkspaceDashboard
          company={company}
          workspace={workspaceForView}
          projects={workspaceProjects}
          insights={insights}
          embeddedLayout
        />
      ) : null}
    </div>
  );
}
