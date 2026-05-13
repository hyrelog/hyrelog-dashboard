import type { WorkspaceOnboardingSetupStage } from '@/generated/prisma/client';

export type WizardStepId =
  | 'use-case'
  | 'workspace-setup'
  | 'region'
  | 'provisioning'
  | 'api-key'
  | 'send-first-event'
  | 'activation-success';

export type WizardSection = 'setup' | 'activation' | 'done';

export const WIZARD_STEPS_UI: ReadonlyArray<{
  readonly id: WizardStepId;
  readonly label: string;
  readonly section: WizardSection;
  readonly helper?: string;
}> = [
  {
    id: 'use-case',
    section: 'setup',
    label: 'Use case',
    helper: 'Tell us how you plan to use HyreLog'
  },
  {
    id: 'workspace-setup',
    section: 'setup',
    label: 'Workspace',
    helper: 'Company and workspace names'
  },
  { id: 'region', section: 'setup', label: 'Data region', helper: 'Where audit data is stored' },
  {
    id: 'provisioning',
    section: 'activation',
    label: 'Provisioning',
    helper: 'Connect your dashboard to HyreLog'
  },
  {
    id: 'api-key',
    section: 'activation',
    label: 'API key',
    helper: 'Create a workspace ingest key'
  },
  {
    id: 'send-first-event',
    section: 'activation',
    label: 'First event',
    helper: 'Send a sample audit event'
  },
  {
    id: 'activation-success',
    section: 'activation',
    label: "You're set",
    helper: 'Continue to the dashboard'
  }
] as const;

/** Public docs site (ingest reference, guides). */
export const HYRELOG_DOCS_BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DOCS_URL?.replace(/\/$/, '')) ||
  'https://docs.hyrelog.com';

export const USE_CASE_OPTIONS = [
  { value: 'application_audit_logs', label: 'Application audit logs' },
  { value: 'compliance_soc2', label: 'Compliance and SOC 2 evidence' },
  { value: 'customer_activity', label: 'Customer activity history' },
  { value: 'security_investigations', label: 'Security investigations' },
  { value: 'internal_observability', label: 'Internal platform observability' },
  { value: 'exploring', label: 'Just exploring' }
] as const;

export type UseCaseValue = (typeof USE_CASE_OPTIONS)[number]['value'];

/** Shown under the region step title — explains regions without overwhelming the page. */
export const REGION_HELP_TEXT =
  'Each option is a HyreLog deployment in that geography. Your workspace’s audit data is stored and processed there, which affects latency for ingestion and queries, and which residency rules apply. Once your organisation is provisioned, it stays in that region, so choose the best fit for where your users and systems are, and any compliance you need today.';

export const STORAGE_REGION_LABEL = 'Choose where your audit data is stored';

/** Support address for “need a closer region” (same default as dashboard help page). */
export const HYRELOG_SUPPORT_EMAIL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ||
  'support@hyrelog.com';

/**
 * Legacy sessionStorage key (no workspace id). Removed on onboarding load so DB resets / new workspaces
 * do not reuse a prior tab's revealed key.
 */
export const LEGACY_ONBOARDING_API_KEY_STORAGE_KEY = 'hyrelog_onboarding_workspace_api_key';

/** SessionStorage key for the revealed ingest key, scoped to this dashboard workspace (survives soft reload; not cookies). */
export function onboardingWorkspaceApiKeyStorageKey(workspaceId: string): string {
  return `${LEGACY_ONBOARDING_API_KEY_STORAGE_KEY}:${workspaceId}`;
}

/** HttpOnly flash cookie: workspace id after first-event activation (one GET /onboarding after RSC refetch). */
export const ONBOARDING_ACTIVATION_SUCCESS_COOKIE = 'hl_onb_activation_ok';

export function onboardingStageForWorkspaceStep(
  step: Extract<WizardStepId, 'use-case' | 'workspace-setup' | 'region'>
): Exclude<WorkspaceOnboardingSetupStage, 'COMPLETE'> {
  if (step === 'use-case') return 'USE_CASE';
  if (step === 'workspace-setup') return 'WORKSPACE';
  return 'REGION';
}
