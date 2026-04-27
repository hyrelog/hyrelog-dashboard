'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/prisma';
import { LoadSchema, SaveSchema } from '@/schemas/onboarding';
import { getFreshSession } from '@/lib/session';
import { safeReturnTo, toCheckEmail } from '@/lib/auth/redirects';
import { provisionWorkspaceAndStore } from '@/actions/provisioning';

/**
 * Finds the workspace that should be onboarded for the creator.
 * In your flow: usually the first (oldest) PENDING workspace in the creator's company.
 */
async function findPendingCreatorWorkspace(companyId: string) {
  return prisma.workspace.findFirst({
    where: {
      companyId,
      deletedAt: null,
      onboardingStatus: 'PENDING'
    },
    orderBy: [{ createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      preferredRegion: true,
      onboardingStatus: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          preferredRegion: true,
          isAutoNamed: true,
          createdByUserId: true
        }
      }
    }
  });
}

// -----------------------------
// 1) Page-load data
// -----------------------------
/**
 * Call this from your onboarding page (server component) to:
 * - require session
 * - require email verified
 * - enforce creator-only onboarding
 * - fetch the company/workspace values to prefill the form
 *
 * If user doesn't need onboarding -> redirects to returnTo or /.
 */
export async function loadOnboardingData(input?: z.infer<typeof LoadSchema>) {
  const parsed = LoadSchema.safeParse(input ?? {});
  const returnTo = safeReturnTo(parsed.success ? parsed.data.returnTo : undefined);

  const session = await getFreshSession();
  if (!session) redirect(`/auth/login?callbackURL=${encodeURIComponent(returnTo)}`);

  if (!session.user.emailVerified) {
    redirect(toCheckEmail(session.user.email, returnTo));
  }

  if (!session.company) redirect(returnTo);
  // Creator-only rule
  const isCreator = session.company.createdByUserId === session.user.id;
  if (!isCreator) redirect(returnTo);

  // Find pending workspace (or validate requested workspaceId if provided)
  const requestedWorkspaceId = parsed.success ? parsed.data.workspaceId : undefined;

  let workspace: Awaited<ReturnType<typeof findPendingCreatorWorkspace>> | null = null;

  if (requestedWorkspaceId) {
    // Must belong to session company AND be pending
    workspace = await prisma.workspace.findFirst({
      where: {
        id: requestedWorkspaceId,
        companyId: session.company.id,
        deletedAt: null,
        onboardingStatus: 'PENDING'
      },
      select: {
        id: true,
        name: true,
        slug: true,
        preferredRegion: true,
        onboardingStatus: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            preferredRegion: true,
            isAutoNamed: true,
            createdByUserId: true
          }
        }
      }
    });
  } else {
    workspace = await findPendingCreatorWorkspace(session.company.id);
  }

  // If nothing pending, creator doesn't need onboarding anymore
  if (!workspace) redirect(returnTo);

  // Extra safety: ensure creator matches company creator
  if (workspace.company.createdByUserId !== session.user.id) redirect(returnTo);

  return {
    session: {
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName
      },
      company: session.company,
      userCompany: session.userCompany
    },
    returnTo,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      preferredRegion: workspace.preferredRegion ?? workspace.company.preferredRegion,
      onboardingStatus: workspace.onboardingStatus
    },
    company: {
      id: workspace.company.id,
      name: workspace.company.name,
      slug: workspace.company.slug,
      preferredRegion: workspace.company.preferredRegion,
      isAutoNamed: workspace.company.isAutoNamed
    }
  };
}

// -----------------------------
// 2) Save onboarding (Continue)
// -----------------------------
/**
 * Persists onboarding form values and marks onboarding COMPLETE on the workspace.
 * Redirects back to returnTo/.
 */
export async function saveOnboarding(values: z.infer<typeof SaveSchema>) {
  const parsed = SaveSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false as const, message: 'Invalid fields.' };
  }

  const { workspaceId, companyName, workspaceName, preferredRegion, returnTo } = parsed.data;
  const rt = safeReturnTo(returnTo);

  const session = await getFreshSession();
  if (!session)
    return {
      success: false as const,
      message: 'Not authenticated.',
      redirectTo: `/auth/login?callbackURL=${encodeURIComponent(rt)}`
    };

  if (!session.user.emailVerified) {
    return {
      success: false as const,
      message: 'Email not verified.',
      redirectTo: toCheckEmail(session.user.email, rt)
    };
  }

  if (!session.company) return { success: false as const, message: 'Not allowed.', redirectTo: rt };
  // Creator-only
  if (session.company.createdByUserId !== session.user.id) {
    return { success: false as const, message: 'Not allowed.', redirectTo: rt };
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      companyId: session.company.id,
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      company: { select: { id: true, name: true } }
    }
  });

  if (!workspace) return { success: false as const, message: 'Workspace not found.' };

  const now = new Date();
  const trimmedCompanyName = companyName?.trim();
  const trimmedWorkspaceName = workspaceName.trim();

  await prisma.$transaction(async (tx) => {
    // Update company (only if changed and provided)
    if (
      trimmedCompanyName &&
      trimmedCompanyName.length >= 2 &&
      trimmedCompanyName !== workspace.company.name
    ) {
      const companyData: Record<string, any> = { name: trimmedCompanyName };
      // if you added Company.isAutoNamed:
      companyData.isAutoNamed = false;

      if (preferredRegion) companyData.preferredRegion = preferredRegion;

      await tx.company.update({
        where: { id: workspace.company.id },
        data: companyData
      });
    } else if (preferredRegion) {
      // region update even if company name not changed
      await tx.company.update({
        where: { id: workspace.company.id },
        data: { preferredRegion }
      });
    }

    // Update workspace + mark onboarding complete
    const wsData: Record<string, any> = {
      onboardingStatus: 'COMPLETE',
      onboardingCompletedAt: now,
      onboardingCompletedBy: session.user.id
    };

    if (trimmedWorkspaceName !== workspace.name) {
      wsData.name = trimmedWorkspaceName;
      // if you added Workspace.isAutoNamed:
      wsData.isAutoNamed = false;
    }

    if (preferredRegion) wsData.preferredRegion = preferredRegion;

    await tx.workspace.update({
      where: { id: workspace.id },
      data: wsData
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: workspace.company.id,
        action: 'SETTINGS_UPDATE',
        resourceType: 'Workspace',
        resourceId: workspace.id,
        details: {
          onboarding: {
            action: 'continue',
            workspaceName: trimmedWorkspaceName,
            companyName: trimmedCompanyName ?? null,
            preferredRegion: preferredRegion ?? null
          }
        }
      }
    });
  });

  // Provision company and workspace in HyreLog API now that region is set (best-effort; do not fail onboarding)
  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role,
  };
  try {
    // Single entry point: reads workspace (and its preferredRegion) to provision company in the right region
    await provisionWorkspaceAndStore(workspace.id, actor);
  } catch (provisionErr) {
    console.warn('HyreLog API provisioning after onboarding failed:', provisionErr);
  }

  return { success: true as const, redirectTo: rt };
}

// -----------------------------
// 3) Skip onboarding
// -----------------------------
/**
 * Marks onboarding COMPLETE without requiring names/fields.
 * Use this for your "Skip for now" button.
 *
 * By default this does NOT change names. (Fast + predictable.)
 * If you want it to still save edits the user typed, call saveOnboarding instead.
 */
export async function skipOnboarding(input: { workspaceId: string; returnTo?: string }) {
  const schema = z.object({
    workspaceId: z.string(),
    returnTo: z.string().optional()
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, message: 'Invalid request.' };
  }

  const rt = safeReturnTo(parsed.data.returnTo);

  const session = await getFreshSession();
  if (!session)
    return {
      success: false as const,
      message: 'Not authenticated.',
      redirectTo: `/auth/login?callbackURL=${encodeURIComponent(rt)}`
    };

  if (!session.user.emailVerified) {
    return {
      success: false as const,
      message: 'Email not verified.',
      redirectTo: toCheckEmail(session.user.email, rt)
    };
  }

  if (!session.company) return { success: false as const, message: 'Not allowed.', redirectTo: rt };
  // Creator-only
  if (session.company.createdByUserId !== session.user.id) {
    return { success: false as const, message: 'Not allowed.', redirectTo: rt };
  }

  const workspace = await prisma.workspace.findFirst({
    where: { id: parsed.data.workspaceId, companyId: session.company.id, deletedAt: null },
    select: { id: true, companyId: true }
  });

  if (!workspace) return { success: false as const, message: 'Workspace not found.' };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: workspace.id },
      data: {
        onboardingStatus: 'COMPLETE',
        onboardingCompletedAt: now,
        onboardingCompletedBy: session.user.id
      }
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: session.company.id,
        action: 'SETTINGS_UPDATE',
        resourceType: 'Workspace',
        resourceId: workspace.id,
        details: {
          onboarding: {
            action: 'skip'
          }
        }
      }
    });
  });

  // Provision company and workspace in HyreLog API (best-effort; company uses default region when skipped)
  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role,
  };
  try {
    await provisionWorkspaceAndStore(workspace.id, actor);
  } catch (provisionErr) {
    console.warn('HyreLog API provisioning after onboarding skip failed:', provisionErr);
  }

  return { success: true as const, redirectTo: rt };
}
