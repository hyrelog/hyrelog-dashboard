import { redirect } from 'next/navigation';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';

export default async function CompanySettingsLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardAccess('/company-settings');
  redirect('/company-settings/overview');
}

