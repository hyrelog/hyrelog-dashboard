import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { safeReturnTo, toCheckEmail } from '@/lib/auth/redirects';
import {
  findWorkspaceIdPendingProductOnboarding,
  isCreatorFirstEventActivationCompleteWorkspace
} from '@/lib/onboarding/eligibility';
import { ONBOARDING_ACTIVATION_SUCCESS_COOKIE } from '@/lib/onboarding/constants';
import { getFreshSession } from '../session';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CheckOnboardingGateResult = {
  workspaceId: string;
  /** One RSC load after activation: show success step even though onboarding is COMPLETE. */
  postActivationSuccess: boolean;
};

/**
 * Gate for `/onboarding` Server Components.
 * Cookie reads only — Next.js forbids `cookies().delete/set` during RSC render (Server Actions / Route Handlers only).
 * Flash cookie is short-lived (see completeOnboardingActivationAction); stale values are ignored via DB checks.
 */
export async function checkOnboardingRequired(callbackUrl?: string): Promise<CheckOnboardingGateResult> {
  const session = await getFreshSession();
  const rt = safeReturnTo(callbackUrl);

  if (!session) {
    redirect(`/auth/login?callbackURL=${encodeURIComponent(rt)}`);
  }

  if (!session.user.emailVerified) {
    redirect(toCheckEmail(session.user.email, rt));
  }

  if (!session.company) redirect(rt);
  const isCreator = session.company.createdByUserId === session.user.id;

  if (!isCreator) {
    redirect(rt);
  }

  const workspacePendingId = await findWorkspaceIdPendingProductOnboarding(session.company.id);

  if (workspacePendingId) {
    return { workspaceId: workspacePendingId, postActivationSuccess: false };
  }

  const cookieStore = await cookies();
  const flashWsId = cookieStore.get(ONBOARDING_ACTIVATION_SUCCESS_COOKIE)?.value;
  if (flashWsId && UUID_RE.test(flashWsId)) {
    const valid = await isCreatorFirstEventActivationCompleteWorkspace(
      session.company.id,
      session.user.id,
      flashWsId
    );
    if (valid) {
      return { workspaceId: flashWsId, postActivationSuccess: true };
    }
  }

  redirect(rt);
}
