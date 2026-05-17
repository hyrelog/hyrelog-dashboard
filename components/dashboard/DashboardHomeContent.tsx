'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { KeyRound, LayoutGrid, FolderKanban } from 'lucide-react';
import { CompanyDashboard } from './CompanyDashboard';
import { WorkspaceDashboard } from './WorkspaceDashboard';
import { EmptyDashboardState } from './EmptyDashboardState';
import { DashboardScopeBar } from './DashboardScopeBar';
import { DashboardHomeBodySkeleton } from './DashboardHomeSkeleton';
import { DashboardStatRibbon } from './DashboardStatRibbon';
import { useDashboardScopeNavigation } from '@/lib/dashboard/useDashboardScopeNavigation';
import type { Company, Workspace, Project, Member, BillingInfo } from '@/types/dashboard';
import type { DashboardHomeInsights } from '@/lib/dashboard/types';
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

function DashboardHomeLoaded({
  company,
  workspaces,
  projects,
  members,
  billingInfo,
  isCompanyAdmin,
  insights,
  workspaceFocusId,
}: DashboardHomeContentProps) {
  const { setScope, isScopePending } = useDashboardScopeNavigation(isCompanyAdmin);
  const [isScopeRefreshing, setIsScopeRefreshing] = useState(false);
  const focusWhenRefreshStarted = useRef(workspaceFocusId);

  const handleScopeChange = useCallback(
    (value: string) => {
      focusWhenRefreshStarted.current = workspaceFocusId;
      setIsScopeRefreshing(true);
      setScope(value);
    },
    [setScope, workspaceFocusId]
  );

  useEffect(() => {
    if (!isScopeRefreshing) return;
    if (!isScopePending || workspaceFocusId !== focusWhenRefreshStarted.current) {
      setIsScopeRefreshing(false);
    }
  }, [isScopeRefreshing, isScopePending, workspaceFocusId]);

  const showScopeLoading = isScopePending || isScopeRefreshing;
  const sortedWorkspaces = [...workspaces].sort((a, b) => a.name.localeCompare(b.name));
  const defaultWorkspace = sortedWorkspaces[0];

  const showCompanyHome = isCompanyAdmin && !workspaceFocusId;
  const focusedWorkspace =
    !showCompanyHome && workspaceFocusId ? sortedWorkspaces.find((w) => w.id === workspaceFocusId) : undefined;
  const workspaceForView = showCompanyHome ? undefined : focusedWorkspace ?? defaultWorkspace;

  const workspaceProjects = workspaceForView
    ? projects.filter((p) => p.workspaceId === workspaceForView.id)
    : [];

  const planLabel = billingInfo?.planName;

  return (
    <>
      <DashboardScopeBar
        company={company}
        workspaces={sortedWorkspaces}
        isCompanyAdmin={isCompanyAdmin}
        workspaceFocusId={workspaceFocusId}
        planLabel={planLabel}
        onScopeChange={handleScopeChange}
        isScopePending={showScopeLoading}
      />

      {showScopeLoading ? (
        <DashboardHomeBodySkeleton />
      ) : (
        <>
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
        </>
      )}
    </>
  );
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

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <Suspense
        fallback={
          <>
            <ScopeBarFallback />
            <DashboardHomeBodySkeleton />
          </>
        }
      >
        <DashboardHomeLoaded
          company={company}
          workspaces={workspaces}
          projects={projects}
          members={members}
          billingInfo={billingInfo}
          isCompanyAdmin={isCompanyAdmin}
          insights={insights}
          workspaceFocusId={workspaceFocusId}
        />
      </Suspense>
    </div>
  );
}
