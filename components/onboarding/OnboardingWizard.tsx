'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { saveUseCaseStep, saveWorkspaceSetupStep, saveRegionStep } from '@/actions/onboarding';
import type { OnboardingWizardProps } from '@/types/onboarding';
import type { WizardStepId } from '@/lib/onboarding/constants';
import {
  LEGACY_ONBOARDING_API_KEY_STORAGE_KEY,
  onboardingWorkspaceApiKeyStorageKey
} from '@/lib/onboarding/constants';
import type { UseCaseValue } from '@/lib/onboarding/constants';

import { OnboardingWizardProgress } from '@/components/onboarding/OnboardingWizardProgress';
import { OnboardingSkipDialog } from '@/components/onboarding/OnboardingSkipDialog';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { ActivationSuccessStep } from '@/components/onboarding/steps/ActivationSuccessStep';
import { ApiKeyStep } from '@/components/onboarding/steps/ApiKeyStep';
import { ProvisioningStep } from '@/components/onboarding/steps/ProvisioningStep';
import { RegionStep } from '@/components/onboarding/steps/RegionStep';
import { SendFirstEventStep } from '@/components/onboarding/steps/SendFirstEventStep';
import { UseCaseStep } from '@/components/onboarding/steps/UseCaseStep';
import { WorkspaceSetupStep } from '@/components/onboarding/steps/WorkspaceSetupStep';
import { safeReturnTo } from '@/lib/auth/redirects';
import type { OnboardingFirstEventSummary } from '@/types/onboarding';

export function OnboardingWizard({
  serverStep,
  workspace,
  companyName,
  companyIsAutoNamed,
  returnTo
}: OnboardingWizardProps) {
  const router = useRouter();
  const [uiStep, setUiStep] = useState<WizardStepId>(serverStep);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [activationFirstEvent, setActivationFirstEvent] = useState<OnboardingFirstEventSummary | null>(null);

  const workspaceId = workspace.id;

  useEffect(() => {
    setUiStep((prev) => {
      if (serverStep === 'activation-success') return 'activation-success';
      const clientLocked: WizardStepId[] = ['send-first-event', 'activation-success'];
      if (clientLocked.includes(prev)) return prev;
      return serverStep;
    });
  }, [serverStep]);

  useEffect(() => {
    try {
      sessionStorage.removeItem(LEGACY_ONBOARDING_API_KEY_STORAGE_KEY);
      const sk = onboardingWorkspaceApiKeyStorageKey(workspaceId);
      const k = sessionStorage.getItem(sk);
      setRevealedKey(k ?? null);
    } catch {
      /* ignore */
    }
  }, [workspaceId]);

  useEffect(() => {
    if (uiStep === 'send-first-event' && !revealedKey) {
      setUiStep('api-key');
    }
  }, [uiStep, revealedKey]);

  const persistKey = useCallback(
    (k: string) => {
      setRevealedKey(k);
      try {
        sessionStorage.setItem(onboardingWorkspaceApiKeyStorageKey(workspaceId), k);
      } catch {
        /* ignore */
      }
    },
    [workspaceId]
  );

  /** Clear copy-once key from memory/session so user can create another key (e.g. forgot to copy). */
  const discardRevealedKey = useCallback(() => {
    setRevealedKey(null);
    try {
      sessionStorage.removeItem(onboardingWorkspaceApiKeyStorageKey(workspaceId));
      sessionStorage.removeItem(LEGACY_ONBOARDING_API_KEY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [workspaceId]);

  const goBackToApiKeyStep = useCallback(() => {
    discardRevealedKey();
    setUiStep('api-key');
  }, [discardRevealedKey]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleActivationComplete = useCallback(
    (event: OnboardingFirstEventSummary) => {
      try {
        sessionStorage.removeItem(onboardingWorkspaceApiKeyStorageKey(workspaceId));
        sessionStorage.removeItem(LEGACY_ONBOARDING_API_KEY_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setRevealedKey(null);
      setActivationFirstEvent(event);
      setUiStep('activation-success');
    },
    [workspaceId]
  );

  const handleUseCase = async (value: UseCaseValue) => {
    setError(null);
    setPending(true);
    try {
      const res = await saveUseCaseStep({ workspaceId, useCaseValue: value, returnTo });
      if (!res.success) {
        setError(res.message ?? 'Could not save use case.');
        return;
      }
      refresh();
    } finally {
      setPending(false);
    }
  };

  const handleWorkspace = async (data: { companyName: string; workspaceName: string }) => {
    setError(null);
    setPending(true);
    try {
      const res = await saveWorkspaceSetupStep({
        workspaceId,
        returnTo,
        companyName: data.companyName || undefined,
        workspaceName: data.workspaceName,
      });
      if (!res.success) {
        setError(res.message ?? 'Could not save workspace.');
        return;
      }
      refresh();
    } finally {
      setPending(false);
    }
  };

  const handleRegion = async (preferredRegion: 'US' | 'EU' | 'UK' | 'AU') => {
    setError(null);
    setPending(true);
    try {
      const res = await saveRegionStep({ workspaceId, returnTo, preferredRegion });
      if (!res.success) {
        setError(res.message ?? 'Could not save region.');
        return;
      }
      refresh();
    } finally {
      setPending(false);
    }
  };

  function handleSkipDone(dest: string) {
    try {
      sessionStorage.removeItem(onboardingWorkspaceApiKeyStorageKey(workspaceId));
      sessionStorage.removeItem(LEGACY_ONBOARDING_API_KEY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    router.replace(safeReturnTo(dest));
    router.refresh();
  }

  const displayStep = uiStep;

  return (
    <OnboardingLayout sidebar={<OnboardingWizardProgress currentStep={displayStep} />}>
      <div className="mt-0">
        {displayStep === 'use-case' && (
          <UseCaseStep initialValue={workspace.onboardingUseCase} onContinue={handleUseCase} pending={pending} error={error} />
        )}

        {displayStep === 'workspace-setup' && (
          <WorkspaceSetupStep
            initialCompanyName={companyName}
            initialWorkspaceName={workspace.name}
            companyIsAutoNamed={companyIsAutoNamed}
            onContinue={handleWorkspace}
            pending={pending}
            error={error}
          />
        )}

        {displayStep === 'region' && (
          <RegionStep
            initialRegion={
              (workspace.preferredRegion === 'US' ||
              workspace.preferredRegion === 'EU' ||
              workspace.preferredRegion === 'UK' ||
              workspace.preferredRegion === 'AU'
                ? workspace.preferredRegion
                : undefined) as 'US' | 'EU' | 'UK' | 'AU' | undefined
            }
            onContinue={handleRegion}
            pending={pending}
            error={error}
          />
        )}

        {displayStep === 'provisioning' && (
          <ProvisioningStep
            workspaceId={workspaceId}
            hasApiWorkspace={!!workspace.apiWorkspaceId}
            returnTo={returnTo}
            onProvisioned={refresh}
          />
        )}

        {displayStep === 'api-key' && workspace.apiWorkspaceId ? (
          <ApiKeyStep
            workspaceId={workspaceId}
            returnTo={returnTo}
            existingKeyCount={workspace.activeApiKeyCount}
            revealedKey={revealedKey}
            onKeyCreated={(full) => {
              persistKey(full);
            }}
            onDiscardRevealedKey={discardRevealedKey}
            onContinue={() => setUiStep('send-first-event')}
          />
        ) : null}

        {displayStep === 'send-first-event' && revealedKey ? (
          <SendFirstEventStep
            apiKey={revealedKey}
            onActivationComplete={handleActivationComplete}
            onDeferOpensSkip={() => setSkipOpen(true)}
            onBackToApiKey={goBackToApiKeyStep}
          />
        ) : null}

        {displayStep === 'activation-success' ? (
          <ActivationSuccessStep
            workspaceId={workspaceId}
            firstEvent={activationFirstEvent}
            returnTo={returnTo}
          />
        ) : null}
      </div>

      <OnboardingSkipDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        workspaceId={workspaceId}
        returnTo={returnTo}
        onSkipped={handleSkipDone}
      />
    </OnboardingLayout>
  );
}
