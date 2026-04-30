'use server';

import * as z from 'zod';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { APIError } from 'better-auth/api';

import { auth, ErrorCode } from '@/lib/auth';
import { LoginSchema } from '@/schemas/auth';
import { prisma } from '@/lib/prisma';
import { safeReturnTo } from '@/lib/auth/redirects';
import { LoginResult, TokenLookupResult } from '@/types/login';
import { UserStatus } from '@/generated/prisma/client';

/* ------------------------------------------------------------------
 * Login
 * ------------------------------------------------------------------ */

export const login = async (
  values: z.infer<typeof LoginSchema>,
  callbackURL?: string
): Promise<LoginResult> => {
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Invalid fields!' };
  }

  const { email, password, rememberMe } = validatedFields.data;
  const rt = safeReturnTo(callbackURL);

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { status: true }
    });

    if (existing?.status === UserStatus.DEACTIVATED) {
      return { error: 'Your account is pending approval. We will email you when approved.' };
    }

    const h = await headers();

    const data = await auth.api.signInEmail({
      headers: h,
      body: {
        email,
        password,
        rememberMe
      }
    });

    if (!data) {
      return { error: 'Login failed1.' };
    }

    // await logUserLogin(data.user.id, {
    //   loginMethod: 'email',
    //   rememberMe
    // });

    return {
      error: null
    };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      const body = err.body as { code?: ErrorCode } | undefined;
      const errCode: ErrorCode | 'UNKNOWN' = body?.code ?? 'UNKNOWN';

      switch (errCode) {
        case 'EMAIL_NOT_VERIFIED':
          redirect('/auth/verify-email');
        default:
          return { error: err.message };
      }
    }

    console.error('[login] Unexpected error:', err);
    return { error: 'Internal Server Error' };
  }
};

/* ------------------------------------------------------------------
 * Get user id from reset-password token
 * ------------------------------------------------------------------ */

export const getUserIdfromToken = async (token: string): Promise<TokenLookupResult> => {
  try {
    const record = await prisma.verification.findFirst({
      where: { identifier: `reset-password:${token}` },
      select: { value: true }
    });

    if (!record) {
      return { data: null, error: true };
    }

    return { data: record.value, error: false };
  } catch (error) {
    console.error('[getUserIdfromToken] Error:', error);
    return { data: null, error: true };
  }
};
