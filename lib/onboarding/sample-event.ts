/**
 * Sample audit event for onboarding docs and copy-paste ingest.
 */

export const ONBOARDING_SAMPLE_PAYLOAD = {
  action: 'user.login',
  actor: {
    id: 'usr_123',
    type: 'user',
    email: 'alex@example.com'
  },
  resource: {
    id: 'session_456',
    type: 'session'
  },
  category: 'auth',
  metadata: {
    source: 'onboarding'
  }
} as const;

/** Payload accepted by POST /v1/events (workspace API keys). Used by onboarding cURL/JSON copy helpers. */
export function onboardingIngestPayloadForApi() {
  return {
    action: ONBOARDING_SAMPLE_PAYLOAD.action,
    category: ONBOARDING_SAMPLE_PAYLOAD.category,
    actor: {
      id: ONBOARDING_SAMPLE_PAYLOAD.actor.id,
      email: ONBOARDING_SAMPLE_PAYLOAD.actor.email,
      role: ONBOARDING_SAMPLE_PAYLOAD.actor.type
    },
    resource: {
      id: ONBOARDING_SAMPLE_PAYLOAD.resource.id,
      type: ONBOARDING_SAMPLE_PAYLOAD.resource.type
    },
    metadata: ONBOARDING_SAMPLE_PAYLOAD.metadata as Record<string, unknown>
  };
}

/** Public ingest base URL shown in cURL (browser + docs). Matches `app/reference/route.ts` fallback. */
export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'https://api.hyrelog.com';
}

export function buildOnboardingIngestCurl(apiKeyPlaceholder: string): string {
  const base = getPublicApiBaseUrl();
  const raw = onboardingIngestPayloadForApi();
  const bodyJson = JSON.stringify(raw);
  return [
    `curl -sS -X POST "${base}/v1/events" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "Authorization: Bearer ${apiKeyPlaceholder}" \\`,
    `  -d '${bodyJson.replace(/'/g, `'\\''`)}'`
  ].join('\n');
}
