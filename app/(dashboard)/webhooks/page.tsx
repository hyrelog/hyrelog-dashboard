import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getWebhooksAction } from '@/actions/webhooks';
import { WebhooksContent } from './WebhooksContent';

export default async function WebhooksPage() {
  await requireDashboardAccess('/webhooks');
  const result = await getWebhooksAction();

  return (
    <WebhooksContent
      webhooks={result.ok ? result.webhooks : []}
      error={result.ok ? null : result.error}
      apiConfigured={result.ok || result.error !== 'API not configured'}
    />
  );
}
