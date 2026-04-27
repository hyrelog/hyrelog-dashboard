'use client';

import { CompanyDashboard } from './CompanyDashboard';
import { WorkspaceDashboard } from './WorkspaceDashboard';
import type { Company, Workspace, Project, Member, BillingInfo } from '@/types/dashboard';

interface DashboardHomeContentProps {
  company: Company;
  workspaces: Workspace[];
  projects: Project[];
  members: Member[];
  billingInfo?: BillingInfo;
  isCompanyAdmin: boolean;
}

export function DashboardHomeContent({
  company,
  workspaces,
  projects,
  members,
  billingInfo,
  isCompanyAdmin
}: DashboardHomeContentProps) {
  // Select first workspace alphabetically when rendering workspace-level dashboard.
  const defaultWorkspace = workspaces.sort((a, b) => a.name.localeCompare(b.name))[0];

  // Company admins/owners/billing users land on company dashboard.
  // Members land on workspace dashboard.
  const currentWorkspace = isCompanyAdmin ? null : defaultWorkspace;

  // Filter projects for current workspace
  const workspaceProjects = currentWorkspace
    ? projects.filter((p) => p.workspaceId === currentWorkspace.id)
    : [];

  return (
    <div className="p-6">
      {currentWorkspace ? (
        <WorkspaceDashboard
          workspace={currentWorkspace}
          projects={workspaceProjects}
          members={members}
          billingInfo={billingInfo}
        />
      ) : (
        <CompanyDashboard
          company={company}
          workspaces={workspaces}
          members={members}
          billingInfo={billingInfo}
        />
      )}
    </div>
  );
}
