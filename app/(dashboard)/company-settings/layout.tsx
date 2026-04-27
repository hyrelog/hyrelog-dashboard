import { CompanySettingsNav } from '@/components/settings/CompanySettingsNav';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';

export default async function CompanySettingsLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardAccess('/company-settings');

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
      <aside className="lg:w-72 shrink-0">
        <CompanySettingsNav />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

