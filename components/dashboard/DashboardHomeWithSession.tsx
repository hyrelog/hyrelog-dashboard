'use client';

import { DashboardHomeContent } from './DashboardHomeContent';
import { useDashboardSession } from '@/lib/dashboard/session-context';
import type { Project, Member, BillingInfo } from '@/types/dashboard';
import type { DashboardHomeInsights } from '@/lib/dashboard/types';

interface DashboardHomeWithSessionProps {
  projects: Project[];
  members: Member[];
  billingInfo?: BillingInfo;
  insights: DashboardHomeInsights;
  /** Resolved server-side scope for HyreLog + home UI (`null` = company overview for admins). */
  workspaceFocusId: string | null;
}

/**
 * Client wrapper that reads session from layout context and renders DashboardHomeContent.
 * Use this from dashboard pages (server components) so they can pass page-specific data
 * without re-fetching session.
 */
export function DashboardHomeWithSession({
  projects,
  members,
  billingInfo,
  insights,
  workspaceFocusId,
}: DashboardHomeWithSessionProps) {
  const { company, workspaces, isCompanyAdmin } = useDashboardSession();

  return (
    <DashboardHomeContent
      company={company}
      workspaces={workspaces}
      projects={projects}
      members={members}
      billingInfo={billingInfo}
      isCompanyAdmin={isCompanyAdmin}
      insights={insights}
      workspaceFocusId={workspaceFocusId}
    />
  );
}
