import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getPostLoginDestination } from '@/lib/auth/postLoginRoute';
import { getFreshSession } from '@/lib/session';
import { safeReturnTo, toLogin } from '@/lib/auth/redirects';

export default async function PostLoginPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const rt = safeReturnTo(returnTo);

  // Use session with fresh emailVerified from DB (e.g. right after magic-link verify)
  const session = await getFreshSession();

  if (!session) redirect(toLogin(rt));

  const dest = await getPostLoginDestination(session as any, rt);
  redirect(dest);
}
