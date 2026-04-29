import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import { loadOnboardingData } from '@/actions/onboarding';
import { checkOnboardingRequired } from '@/lib/auth/checkOnboardingRequired';

type SupportedDataRegion = 'US' | 'EU' | 'UK' | 'AU';

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { session, workspaceId } = await checkOnboardingRequired();

  const { company } = session;

  const sp = await searchParams;
  const data = await loadOnboardingData({
    workspaceId: workspaceId,
    returnTo: sp.returnTo
  });

  const preferredRegionRaw = data.workspace?.preferredRegion;
  const preferredRegion: SupportedDataRegion | undefined =
    preferredRegionRaw === 'US' || preferredRegionRaw === 'EU' || preferredRegionRaw === 'UK' || preferredRegionRaw === 'AU'
      ? preferredRegionRaw
      : preferredRegionRaw === 'APAC'
        ? 'AU'
        : undefined;

  const returnData = {
    workspaceId: workspaceId,
    workspaceName: data.workspace?.name,
    companyName: data.company?.name,
    preferredRegion,
    returnTo: sp.returnTo
  };

  return (
    <OnboardingLayout>
      <OnboardingForm
        data={returnData}
        isAutoNamed={company?.isAutoNamed}
      />
    </OnboardingLayout>
  );
}
