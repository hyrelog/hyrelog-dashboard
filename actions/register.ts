'use server';

import * as z from 'zod';
import GithubSlugger from 'github-slugger';
import { APIError } from 'better-auth/api';
import {
  Prisma,
  CompanyRole,
  WorkspaceRole,
  SubscriptionStatus,
  AuditAction
} from '@/generated/prisma/client';

import { RegisterSchema } from '@/schemas/register';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email/sendVerificationEmail';
import { EmailCheckResult, RegisterInitialData } from '@/types/register';
import { ActionResult } from '@/types/global';

let cachedDomains: string[] | null = null;
let lastFetched: number | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

/* ------------------------------------------------------------------
 * registerInitial
 * ------------------------------------------------------------------ */

export const registerInitial = async (
  values: z.infer<typeof RegisterSchema>
): Promise<ActionResult<RegisterInitialData>> => {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Invalid fields'
    };
  }

  const { firstName, lastName, email, password, companyName } = validatedFields.data;

  const name = `${firstName} ${lastName}`;

  const compName = companyName || `${name}'s Company`;
  const isAutoNamed = companyName ? false : true;

  try {
    const emailCheck = await checkEmail(email);

    if (emailCheck.error) {
      return {
        success: false,
        message: `Email is invalid - ${emailCheck.error}`
      };
    }
    if (emailCheck.isDisposable) {
      return {
        success: false,
        message: 'Email is invalid'
      };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return {
        success: false,
        message: 'An account with this email already exists.'
      };
    }

    // Register via Better Auth
    const data = await auth.api.signUpEmail({
      body: {
        name,
        firstName,
        lastName,
        email,
        password,
        acceptTermsAt: new Date()
      }
    });

    // Alpha: self-serve signups get Business (dashboard entitlements); toggle to FREE post-launch if needed.
    const plan = await prisma.plan.findUnique({ where: { code: 'BUSINESS' } });

    if (!plan) {
      return {
        success: false,
        message: 'BUSINESS plan not found — ensure prisma seedPlans has run'
      };
    }

    const planId = plan.id;

    const userId = data.user?.id;
    if (!userId) {
      return {
        success: false,
        message: 'Sign up succeeded but user id was not returned.'
      };
    }

    function buildCompanySlug(base: string, attempt: number) {
      const companySlugger = new GithubSlugger();
      const label = attempt === 0 ? base : `${base} ${attempt + 1}`;
      return companySlugger.slug(label);
    }

    async function runRegistrationTransaction(maxAttempts = 10) {
      let lastErr: unknown;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const companySlug = buildCompanySlug(compName, attempt);
        try {
          if (attempt > 0) {
            console.warn(
              `Retrying registration transaction (attempt ${attempt + 1}/${maxAttempts})`
            );
          }
          return await prisma.$transaction(async (tx) => {
            // 1) Audit: USER_CREATED
            await tx.auditLog.create({
              data: {
                userId,
                action: AuditAction.USER_CREATED,
                resourceType: 'User',
                resourceId: userId,
                details: {
                  email,
                  firstName,
                  lastName,
                  via: 'SELF_SERVE'
                }
              }
            });

            // 2) Create company with unique slug
            const company = await tx.company.create({
              data: {
                name: compName,
                slug: companySlug,
                createdVia: 'SELF_SERVE',
                createdByUserId: userId,
                isAutoNamed,

                // Membership: user is OWNER
                members: {
                  create: {
                    userId,
                    role: CompanyRole.OWNER
                  }
                }
              }
            });

            // 3) Audit: COMPANY_CREATED
            await tx.auditLog.create({
              data: {
                userId,
                companyId: company.id,
                action: AuditAction.COMPANY_CREATED,
                resourceType: 'Company',
                resourceId: company.id,
                details: {
                  name: company.name,
                  slug: company.slug
                }
              }
            });

            // 4) Create workspace "Production" with slug scoped to company
            const workspace = await tx.workspace.create({
              data: {
                companyId: company.id,
                name: 'Production',
                slug: 'production',

                // Membership: user is ADMIN
                members: {
                  create: {
                    userId,
                    role: WorkspaceRole.ADMIN
                  }
                }
              }
            });

            // 5) Audit: WORKSPACE_CREATED
            await tx.auditLog.create({
              data: {
                userId,
                companyId: company.id,
                action: AuditAction.WORKSPACE_CREATED,
                resourceType: 'Workspace',
                resourceId: workspace.id,
                details: {
                  name: workspace.name,
                  slug: workspace.slug
                }
              }
            });

            // 6) Create subscription (ACTIVE, plan.id)
            const subscription = await tx.subscription.create({
              data: {
                companyId: company.id,
                planId,
                status: SubscriptionStatus.ACTIVE
              }
            });

            return { company, workspace, subscription };
          });
        } catch (err) {
          lastErr = err;
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            console.warn(
              `Registration transaction hit unique constraint (attempt ${attempt + 1}/${maxAttempts})`
            );
            continue;
          }
          throw err;
        }
      }
      throw lastErr ?? new Error('Failed to complete registration transaction.');
    }

    const result = await runRegistrationTransaction();

    // Provisioning is deferred until after onboarding so the user's chosen region is used.

    // Send verification email (magic link + OTP fallback)
    // Don't fail registration if email fails - user is already registered
    try {
      await sendVerificationEmail({
        userId: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName ?? undefined
      });
      console.log(`✅ Verification email sent to ${data.user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Continue - user is registered, they can request a new email
    }

    return {
      success: true,
      message: 'Registration started successfully',
      data: {
        userId: data.user.id,
        email: data.user.email
      }
    };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      return {
        success: false,
        message: err.message
      };
    }

    return {
      success: false,
      message: `Internal Server Error: ${err}`
    };
  }
};

/* ------------------------------------------------------------------
 * checkEmail (kept as EmailCheckResult)
 * ------------------------------------------------------------------ */

export const checkEmail = async (email: string): Promise<EmailCheckResult> => {
  try {
    // Basic format validation
    if (!email || !email.includes('@')) {
      return { isDisposable: false, error: 'Invalid email format' };
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return { isDisposable: false, error: 'Invalid email domain' };
    }

    // Refresh disposable domain list if needed
    const now = Date.now();
    if (!cachedDomains || !lastFetched || now - lastFetched > CACHE_DURATION) {
      const response = await fetch(
        'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf',
        { cache: 'force-cache' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch disposable email domains');
      }

      const text = await response.text();
      cachedDomains = text
        .split('\n')
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line && !line.startsWith('#'));
      lastFetched = now;
    }

    const isDisposable = cachedDomains.includes(domain);

    return { isDisposable, error: null };
  } catch (error) {
    console.error('Error checking email:', error);
    return { isDisposable: false, error: 'Server error occurred' };
  }
};
