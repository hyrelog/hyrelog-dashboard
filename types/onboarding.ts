import type { WorkspaceOnboardingRow } from '@/lib/onboarding/eligibility';
import type { WizardStepId } from '@/lib/onboarding/constants';

/** Snapshot `loadOnboardingData` workspace shape for the wizard shell. */
export type LoadedOnboardingWorkspace = WorkspaceOnboardingRow & {
  name: string;
  slug: string;
  preferredRegion: string | null;
  activeApiKeyCount: number;
};

export interface OnboardingWizardProps {
  serverStep: WizardStepId;
  workspace: LoadedOnboardingWorkspace;
  companyName: string;
  companyIsAutoNamed: boolean;
  returnTo?: string;
}

export interface OnboardingLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/** Summary of the first ingested audit event (safe fields only). */
export type OnboardingFirstEventSummary = {
  id?: string;
  action?: string;
  actor?: string;
  resource?: string;
  category?: string;
  timestamp?: string;
};
