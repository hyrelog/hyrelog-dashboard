import { z } from 'zod';

import { USE_CASE_OPTIONS } from '@/lib/onboarding/constants';

export const LoadSchema = z.object({
  workspaceId: z.string().optional(),
  returnTo: z.string().optional()
});

const useCaseValues = USE_CASE_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const SaveUseCaseStepSchema = z.object({
  workspaceId: z.string().uuid(),
  returnTo: z.string().optional(),
  /** Stored as `workspace.onboardingUseCase` — must match predefined option value. */
  useCaseValue: z.enum(useCaseValues)
});

export const SaveWorkspaceSetupStepSchema = z.object({
  workspaceId: z.string().uuid(),
  returnTo: z.string().optional(),
  companyName: z.string().trim().max(80).optional(),
  workspaceName: z.string().trim().min(2, 'Workspace name must be at least 2 characters.').max(80)
});

export const SaveRegionStepSchema = z.object({
  workspaceId: z.string().uuid(),
  returnTo: z.string().optional(),
  preferredRegion: z.enum(['US', 'EU', 'UK', 'AU'])
});

/** Skip ends product onboarding (activation deferred explicitly). Requires a non-empty reason. */
export const SkipOnboardingSchema = z.object({
  workspaceId: z.string().uuid(),
  returnTo: z.string().optional(),
  skipReason: z.string().trim().min(3, 'Add a short reason to confirm skip.').max(500)
});

/** Server resolves the pending onboarding workspace; client cannot supply a workspace id. */
export const CheckOnboardingFirstEventSchema = z.object({}).strict();

export const CompleteOnboardingActivationSchema = z.object({}).strict();
