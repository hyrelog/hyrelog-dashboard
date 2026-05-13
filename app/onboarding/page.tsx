import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { loadOnboardingData, loadOnboardingActivationSuccessData } from '@/actions/onboarding';
import { checkOnboardingRequired } from '@/lib/auth/checkOnboardingRequired';
import type { LoadedOnboardingWorkspace } from '@/types/onboarding';
import { getResolvedWizardServerStep } from '@/lib/onboarding/eligibility';
import type { WizardStepId } from '@/lib/onboarding/constants';

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const sp = await searchParams;
  const gate = await checkOnboardingRequired(sp.returnTo);

  const data = gate.postActivationSuccess
    ? await loadOnboardingActivationSuccessData({
        workspaceId: gate.workspaceId,
        returnTo: sp.returnTo
      })
    : await loadOnboardingData({
        workspaceId: gate.workspaceId,
        returnTo: sp.returnTo
      });

  const w = data.workspace;
  const wizardWorkspace: LoadedOnboardingWorkspace = {
    id: w.id,
    name: w.name,
    slug: w.slug,
    preferredRegion: w.preferredRegion ?? null,
    onboardingStatus: w.onboardingStatus,
    onboardingUseCase: w.onboardingUseCase,
    onboardingSetupStage: w.onboardingSetupStage,
    onboardingSetupCompletedAt: w.onboardingSetupCompletedAt,
    onboardingActivationCompletedAt: w.onboardingActivationCompletedAt,
    onboardingSkippedAt: w.onboardingSkippedAt,
    firstAuditEventReceivedAt: w.firstAuditEventReceivedAt,
    apiWorkspaceId: w.apiWorkspaceId,
    activeApiKeyCount: w.activeApiKeyCount
  };

  const serverStep: WizardStepId = gate.postActivationSuccess
    ? 'activation-success'
    : getResolvedWizardServerStep(wizardWorkspace);

  return (
    <OnboardingWizard
      serverStep={serverStep}
      workspace={wizardWorkspace}
      companyName={data.company.name}
      companyIsAutoNamed={data.company.isAutoNamed}
      returnTo={sp.returnTo}
    />
  );
}
