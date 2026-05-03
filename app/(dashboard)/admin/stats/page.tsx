import { redirect } from 'next/navigation';

import { getPlatformAdminStats } from '@/actions/platform-admin';
import { AdminStatsContent } from '@/components/admin/AdminStatsContent';

export default async function AdminStatsPage() {
  const result = await getPlatformAdminStats();

  if (!result.ok) {
    redirect('/');
  }

  return <AdminStatsContent stats={result.stats} />;
}
