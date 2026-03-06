import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getExportsAction } from '@/actions/exports';
import { ExportsContent } from './ExportsContent';

export default async function ExportsPage() {
  await requireDashboardAccess('/exports');
  const result = await getExportsAction();

  return (
    <ExportsContent
      jobs={result.ok ? result.jobs : []}
      error={result.ok ? null : result.error}
      apiConfigured={result.ok || result.error !== 'API not configured'}
    />
  );
}
