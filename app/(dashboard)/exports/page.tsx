import { Suspense } from 'react';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getExportTemplatesAction, getExportsAction } from '@/actions/exports';
import { ExportsContent } from './ExportsContent';

export default async function ExportsPage() {
  await requireDashboardAccess('/exports');
  const [result, tpl] = await Promise.all([getExportsAction(), getExportTemplatesAction()]);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading exports…</div>}>
      <ExportsContent
        jobs={result.ok ? result.jobs : []}
        error={result.ok ? null : result.error}
        apiConfigured={result.ok || result.error !== 'API not configured'}
        templates={tpl.ok ? tpl.templates : []}
        templatesError={tpl.ok ? null : tpl.error}
      />
    </Suspense>
  );
}
