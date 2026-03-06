import { redirect } from 'next/navigation';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { CompanySettingsContent } from './CompanySettingsContent';
import { prisma } from '@/lib/prisma';

export default async function CompanySettingsPage() {
  const session = await requireDashboardAccess('/settings/company');
  const companyId = (session as { company: { id: string } }).company.id;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  const canEdit = ['OWNER', 'ADMIN'].includes(userRole);

  const company = await prisma.company.findFirst({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      preferredRegion: true,
      status: true,
      apiCompanyId: true,
    },
  });

  if (!company) redirect('/');

  return (
    <CompanySettingsContent
      company={company}
      canEdit={canEdit}
    />
  );
}
