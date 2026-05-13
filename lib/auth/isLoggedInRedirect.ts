'use server';

import { redirect } from 'next/navigation';
import { getPostLoginDestination } from '@/lib/auth/postLoginRoute';
import { safeReturnTo } from '@/lib/auth/redirects';
import { getFreshSession } from '@/lib/session';

/**
 * Must use the same session resolution as gated pages (`getFreshSession`).
 * Otherwise users can loop: login sees a cached session → onboarding, onboarding uses fresh read → no session → login.
 */
export async function redirectIfLoggedIn(callbackURL?: string) {
  const rt = safeReturnTo(callbackURL);

  const session = await getFreshSession();
  if (!session?.user?.id) return null;

  const dest = await getPostLoginDestination(session as never, rt);
  redirect(dest);
}
