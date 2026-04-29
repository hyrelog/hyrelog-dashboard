import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getCompanyAccess } from '@/lib/workspaces/access';
import { listWorkspacesForCompany, listWorkspacesForUser } from '@/lib/workspaces/queries';
import { WorkspacesContent } from '@/components/workspaces/list/WorkspacesContent';
import { CreateWorkspaceSheet } from '@/components/workspaces/list/CreateWorkspaceSheet';
import { prisma } from '@/lib/prisma';

type SupportedDataRegion = 'US' | 'EU' | 'UK' | 'AU';

export default async function WorkspacesPage() {
  const session = await requireDashboardAccess('/workspaces');

  const access = await getCompanyAccess(session.user.id, session.company.id);
  const seeAllWorkspaces = (access?.canAdmin || access?.canBilling) ?? false;

  const workspaces = seeAllWorkspaces
    ? await listWorkspacesForCompany(session.company.id)
    : await listWorkspacesForUser(session.user.id);

  const memberWithNoWorkspaces = !seeAllWorkspaces && workspaces.length === 0;
  const companyName = memberWithNoWorkspaces
    ? (await prisma.company.findUnique({
        where: { id: session.company.id },
        select: { name: true }
      }))?.name ?? undefined
    : undefined;

  // Legacy companies can still have APAC persisted; map to AU for current region options.
  const preferredRegionRaw = session.company.preferredRegion as string | null | undefined;
  const companyPreferredRegion: SupportedDataRegion | null =
    preferredRegionRaw === 'US' || preferredRegionRaw === 'EU' || preferredRegionRaw === 'UK' || preferredRegionRaw === 'AU'
      ? preferredRegionRaw
      : preferredRegionRaw === 'APAC'
        ? 'AU'
        : null;

  return (
    <WorkspacesContent
      workspaces={workspaces}
      isAdmin={seeAllWorkspaces}
      companyName={companyName}
      memberWithNoWorkspaces={memberWithNoWorkspaces}
      createButton={
        seeAllWorkspaces ? (
          <CreateWorkspaceSheet companyPreferredRegion={companyPreferredRegion} />
        ) : null
      }
    />
  );
}
