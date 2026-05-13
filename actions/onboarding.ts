'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';
import {
  LoadSchema,
  SaveUseCaseStepSchema,
  SaveWorkspaceSetupStepSchema,
  SaveRegionStepSchema,
  SkipOnboardingSchema,
  CheckOnboardingFirstEventSchema,
  CompleteOnboardingActivationSchema
} from '@/schemas/onboarding';
import { getFreshSession } from '@/lib/session';
import { safeReturnTo, toCheckEmail } from '@/lib/auth/redirects';
import { provisionWorkspaceAndStore, createKeyAndSync } from '@/actions/provisioning';
import { isApiKeySyncConfigured } from '@/lib/hyrelog-api/key-format';
import { findWorkspaceIdPendingProductOnboarding } from '@/lib/onboarding/eligibility';
import { ONBOARDING_ACTIVATION_SUCCESS_COOKIE } from '@/lib/onboarding/constants';
import { getDashboardEvents } from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';

const onboardingWorkspaceDetailSelect = {
  id: true,
  name: true,
  slug: true,
  preferredRegion: true,
  onboardingStatus: true,
  onboardingUseCase: true,
  onboardingSetupStage: true,
  onboardingSetupCompletedAt: true,
  firstAuditEventReceivedAt: true,
  onboardingSkippedAt: true,
  onboardingActivationCompletedAt: true,
  apiWorkspaceId: true,
  company: {
    select: {
      id: true,
      name: true,
      slug: true,
      preferredRegion: true,
      isAutoNamed: true,
      createdByUserId: true
    }
  },
  _count: {
    select: {
      apiKeys: {
        where: { revokedAt: null }
      }
    }
  }
} as const;

async function loadPendingWorkspaceOrNull(companyId: string, workspaceIdOpt: string | undefined) {
  if (workspaceIdOpt) {
    const w = await prisma.workspace.findFirst({
      where: {
        id: workspaceIdOpt,
        companyId,
        deletedAt: null,
        onboardingStatus: 'PENDING'
      },
      select: onboardingWorkspaceDetailSelect
    });
    return w;
  }
  return prisma.workspace.findFirst({
    where: {
      companyId,
      deletedAt: null,
      onboardingStatus: 'PENDING'
    },
    orderBy: [{ createdAt: 'asc' }],
    select: onboardingWorkspaceDetailSelect
  });
}

// -----------------------------
// Page-load data
// -----------------------------
export async function loadOnboardingData(input?: z.infer<typeof LoadSchema>) {
  const parsed = LoadSchema.safeParse(input ?? {});
  const returnTo = safeReturnTo(parsed.success ? parsed.data.returnTo : undefined);

  const session = await getFreshSession();
  if (!session) redirect(`/auth/login?callbackURL=${encodeURIComponent(returnTo)}`);

  if (!session.user.emailVerified) {
    redirect(toCheckEmail(session.user.email, returnTo));
  }

  if (!session.company) redirect(returnTo);
  if (session.company.createdByUserId !== session.user.id) redirect(returnTo);

  const workspaceIdRequested = parsed.success ? parsed.data.workspaceId : undefined;
  const workspace = await loadPendingWorkspaceOrNull(session.company.id, workspaceIdRequested);

  if (!workspace) redirect(returnTo);
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
      onboardingStatus: workspace.onboardingStatus,
      onboardingUseCase: workspace.onboardingUseCase,
      onboardingSetupStage: workspace.onboardingSetupStage,
      onboardingSetupCompletedAt: workspace.onboardingSetupCompletedAt,
      firstAuditEventReceivedAt: workspace.firstAuditEventReceivedAt,
      onboardingSkippedAt: workspace.onboardingSkippedAt,
      onboardingActivationCompletedAt: workspace.onboardingActivationCompletedAt,
      apiWorkspaceId: workspace.apiWorkspaceId,
      activeApiKeyCount: workspace._count.apiKeys
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

/** Load workspace for the post–first-event success screen (COMPLETE, creator-owned). */
export async function loadOnboardingActivationSuccessData(input: {
  workspaceId: string;
  returnTo?: string;
}) {
  const returnTo = safeReturnTo(input.returnTo);
  const wsParse = z.string().uuid().safeParse(input.workspaceId);
  if (!wsParse.success) redirect(returnTo);
  const workspaceId = wsParse.data;

  const session = await getFreshSession();
  if (!session) redirect(`/auth/login?callbackURL=${encodeURIComponent(returnTo)}`);

  if (!session.user.emailVerified) {
    redirect(toCheckEmail(session.user.email, returnTo));
  }

  if (!session.company) redirect(returnTo);
  if (session.company.createdByUserId !== session.user.id) redirect(returnTo);

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      companyId: session.company.id,
      deletedAt: null,
      onboardingStatus: 'COMPLETE',
      firstAuditEventReceivedAt: { not: null },
      company: { createdByUserId: session.user.id }
    },
    select: onboardingWorkspaceDetailSelect
  });

  if (!workspace) redirect(returnTo);

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
      onboardingStatus: workspace.onboardingStatus,
      onboardingUseCase: workspace.onboardingUseCase,
      onboardingSetupStage: workspace.onboardingSetupStage,
      onboardingSetupCompletedAt: workspace.onboardingSetupCompletedAt,
      firstAuditEventReceivedAt: workspace.firstAuditEventReceivedAt,
      onboardingSkippedAt: workspace.onboardingSkippedAt,
      onboardingActivationCompletedAt: workspace.onboardingActivationCompletedAt,
      apiWorkspaceId: workspace.apiWorkspaceId,
      activeApiKeyCount: workspace._count.apiKeys
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

async function assertCreatorPendingWorkspace(
  workspaceId: string,
  companyId: string,
  userId: string
): Promise<{ id: string; companyId: string } | null> {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      companyId,
      deletedAt: null,
      onboardingStatus: 'PENDING',
      company: { createdByUserId: userId }
    },
    select: { id: true, companyId: true }
  });
  return workspace;
}

export async function saveUseCaseStep(values: z.infer<typeof SaveUseCaseStepSchema>) {
  const parsed = SaveUseCaseStepSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const rt = safeReturnTo(parsed.data.returnTo);
  const session = await getFreshSession();
  if (!session)
    return { success: false as const, message: 'Not authenticated.', redirectTo: `/auth/login?callbackURL=${encodeURIComponent(rt)}` };
  if (!session.user.emailVerified) {
    return { success: false as const, message: 'Email not verified.', redirectTo: toCheckEmail(session.user.email, rt) };
  }
  if (!session.company?.createdByUserId || session.company.createdByUserId !== session.user.id) {
    return { success: false as const, message: 'Not allowed.', redirectTo: rt };
  }

  const ws = await assertCreatorPendingWorkspace(parsed.data.workspaceId, session.company.id, session.user.id);
  if (!ws) return { success: false as const, message: 'Workspace not found.' };

  await prisma.workspace.update({
    where: { id: ws.id },
    data: {
      onboardingUseCase: parsed.data.useCaseValue,
      onboardingSetupStage: 'WORKSPACE'
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: ws.companyId,
      action: 'SETTINGS_UPDATE',
      resourceType: 'Workspace',
      resourceId: ws.id,
      details: { onboarding: { action: 'use_case', useCase: parsed.data.useCaseValue } }
    }
  });

  return { success: true as const };
}

export async function saveWorkspaceSetupStep(values: z.infer<typeof SaveWorkspaceSetupStepSchema>) {
  const parsed = SaveWorkspaceSetupStepSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const rt = safeReturnTo(parsed.data.returnTo);
  const session = await getFreshSession();
  if (!session)
    return { success: false as const, message: 'Not authenticated.', redirectTo: `/auth/login?callbackURL=${encodeURIComponent(rt)}` };
  if (!session.user.emailVerified) {
    return { success: false as const, message: 'Email not verified.', redirectTo: toCheckEmail(session.user.email, rt) };
  }
  if (!session.company?.createdByUserId || session.company.createdByUserId !== session.user.id) {
    return { success: false as const, message: 'Not allowed.', redirectTo: rt };
  }

  const ws = await prisma.workspace.findFirst({
    where: {
      id: parsed.data.workspaceId,
      companyId: session.company.id,
      deletedAt: null,
      onboardingStatus: 'PENDING'
    },
    select: {
      id: true,
      name: true,
      companyId: true,
      company: { select: { id: true, name: true } }
    }
  });
  if (!ws) return { success: false as const, message: 'Workspace not found.' };

  const trimmedCompanyName = parsed.data.companyName?.trim();
  const trimmedWorkspaceName = parsed.data.workspaceName.trim();

  await prisma.$transaction(async (tx) => {
    if (trimmedCompanyName && trimmedCompanyName.length >= 2 && trimmedCompanyName !== ws.company.name) {
      await tx.company.update({
        where: { id: ws.company.id },
        data: { name: trimmedCompanyName, isAutoNamed: false }
      });
    }

    await tx.workspace.update({
      where: { id: ws.id },
      data: {
        ...(trimmedWorkspaceName !== ws.name
          ? { name: trimmedWorkspaceName, isAutoNamed: false }
          : {}),
        onboardingSetupStage: 'REGION'
      }
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: ws.companyId,
        action: 'SETTINGS_UPDATE',
        resourceType: 'Workspace',
        resourceId: ws.id,
        details: {
          onboarding: {
            action: 'workspace_names',
            workspaceName: trimmedWorkspaceName,
            companyName: trimmedCompanyName ?? null
          }
        }
      }
    });
  });

  return { success: true as const };
}

export async function saveRegionStep(values: z.infer<typeof SaveRegionStepSchema>) {
  const parsed = SaveRegionStepSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const rt = safeReturnTo(parsed.data.returnTo);
  const session = await getFreshSession();
  if (!session)
    return { success: false as const, message: 'Not authenticated.', redirectTo: `/auth/login?callbackURL=${encodeURIComponent(rt)}` };
  if (!session.user.emailVerified) {
    return { success: false as const, message: 'Email not verified.', redirectTo: toCheckEmail(session.user.email, rt) };
  }
  if (!session.company?.createdByUserId || session.company.createdByUserId !== session.user.id) {
    return { success: false as const, message: 'Not allowed.', redirectTo: rt };
  }

  const preferredRegion = parsed.data.preferredRegion;
  const now = new Date();

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: parsed.data.workspaceId,
      companyId: session.company.id,
      deletedAt: null,
      onboardingStatus: 'PENDING'
    },
    select: {
      id: true,
      company: { select: { id: true } }
    }
  });

  if (!workspace) return { success: false as const, message: 'Workspace not found.' };

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: workspace.company.id },
      data: { preferredRegion }
    });
    await tx.workspace.update({
      where: { id: workspace.id },
      data: {
        preferredRegion,
        onboardingSetupCompletedAt: now,
        onboardingSetupStage: 'COMPLETE'
      }
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
            action: 'region_and_setup_complete',
            preferredRegion
          }
        }
      }
    });
  });

  return { success: true as const };
}

export async function provisionOnboardingWorkspaceAction(workspaceId: string, returnTo?: string) {
  const rt = safeReturnTo(returnTo);
  const session = await getFreshSession();
  if (!session) {
    return { ok: false as const, error: 'Not authenticated.', redirectTo: `/auth/login?callbackURL=${encodeURIComponent(rt)}` };
  }
  if (!session.user.emailVerified) {
    return {
      ok: false as const,
      error: 'Email not verified.',
      redirectTo: toCheckEmail(session.user.email, rt)
    };
  }
  if (!session.company?.createdByUserId || session.company.createdByUserId !== session.user.id) {
    return { ok: false as const, error: 'Not allowed.', redirectTo: rt };
  }

  const ws = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      companyId: session.company.id,
      deletedAt: null,
      onboardingStatus: 'PENDING',
      onboardingSetupCompletedAt: { not: null }
    },
    select: { id: true }
  });
  if (!ws) return { ok: false as const, error: 'Workspace not ready for provisioning.', redirectTo: rt };

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role
  };

  const result = await provisionWorkspaceAndStore(ws.id, actor);
  if (!result.ok) {
    return { ok: false as const, error: result.error, redirectTo: rt };
  }
  return { ok: true as const, apiWorkspaceId: result.apiWorkspaceId };
}

const CreateOnboardingKeySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  returnTo: z.string().optional()
});

export async function createOnboardingApiKeyAction(input: z.infer<typeof CreateOnboardingKeySchema>) {
  const parsed = CreateOnboardingKeySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid request.' };
  }
  const rt = safeReturnTo(parsed.data.returnTo);
  const session = await getFreshSession();
  if (!session?.company?.id || session.company.createdByUserId !== session.user.id || !session.user.emailVerified) {
    return { ok: false as const, error: 'Not allowed.', redirectTo: `/auth/login?callbackURL=${encodeURIComponent(rt)}` };
  }

  const ws = await prisma.workspace.findFirst({
    where: {
      id: parsed.data.workspaceId,
      companyId: session.company.id,
      deletedAt: null,
      onboardingStatus: 'PENDING',
      apiWorkspaceId: { not: null }
    },
    select: { id: true, status: true }
  });
  if (!ws) return { ok: false as const, error: 'Workspace must be provisioned before creating keys.' };
  if (ws.status !== 'ACTIVE') return { ok: false as const, error: 'Workspace is not active.' };

  if (!isApiKeySyncConfigured()) {
    return {
      ok: false as const,
      error:
        'HYRELOG_API_KEY_SECRET is not configured. Set it so onboarding can create synced hlk_* keys for ingestion.'
    };
  }

  const name = parsed.data.name?.trim() ?? 'Onboarding';
  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role
  };

  const result = await createKeyAndSync(ws.id, name, actor);
  if (!result.ok) return { ok: false as const, error: result.error };

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: session.company.id,
      action: 'SETTINGS_UPDATE',
      resourceType: 'WorkspaceApiKey',
      resourceId: result.keyId,
      details: { apiKey: { action: 'create_onboarding', id: result.keyId, name, prefix: result.prefix } }
    }
  });

  return {
    ok: true as const,
    keyId: result.keyId,
    fullKey: result.fullKey,
    prefix: result.prefix,
    name
  };
}

export async function skipOnboarding(input: z.infer<typeof SkipOnboardingSchema>) {
  const parsed = SkipOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message ?? 'Invalid request.' };
  }

  const { workspaceId, returnTo, skipReason } = parsed.data;
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

  if (!session.company?.createdByUserId || session.company.createdByUserId !== session.user.id) {
    return { success: false as const, message: 'Not allowed.', redirectTo: rt };
  }

  const pendingId = await findWorkspaceIdPendingProductOnboarding(session.company.id);
  if (!pendingId || pendingId !== workspaceId) {
    return { success: false as const, message: 'Workspace not found or onboarding already finished.' };
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      companyId: session.company.id,
      deletedAt: null,
      onboardingStatus: 'PENDING'
    },
    select: { id: true, companyId: true }
  });

  if (!workspace) {
    return { success: false as const, message: 'Workspace not found or onboarding already finished.' };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: workspace.id },
      data: {
        onboardingStatus: 'COMPLETE',
        onboardingCompletedAt: now,
        onboardingCompletedBy: session.user.id,
        onboardingSkippedAt: now,
        onboardingSkipReason: skipReason,
        onboardingActivationCompletedAt: now
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
            action: 'skip_activation',
            skipReason
          }
        }
      }
    });
  });

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role
  };
  try {
    await provisionWorkspaceAndStore(workspace.id, actor);
  } catch {
    console.warn('HyreLog API provisioning after onboarding skip failed');
  }

  return { success: true as const, redirectTo: rt };
}

function onboardingDashboardActor(
  session: NonNullable<Awaited<ReturnType<typeof getFreshSession>>>,
  companyId: string
) {
  return {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? '',
    userRole: (session.userCompany as { role: string }).role,
    companyId
  };
}

function mapAuditEventSummary(
  ev: Awaited<ReturnType<typeof getDashboardEvents>>['events'][number]
): {
  id?: string;
  action?: string;
  actor?: string;
  resource?: string;
  category?: string;
  timestamp?: string;
} {
  const actor =
    [ev.actorEmail, ev.actorId].filter(Boolean).join(' · ') ||
    ev.actorRole ||
    undefined;
  const resource =
    ev.resourceType || ev.resourceId
      ? [ev.resourceType, ev.resourceId].filter(Boolean).join(': ')
      : undefined;
  return {
    id: ev.id,
    action: ev.action,
    actor,
    resource,
    category: ev.category,
    timestamp: ev.timestamp
  };
}

export type CheckOnboardingFirstEventResult =
  | {
      ok: true;
      hasEvent: boolean;
      event?: {
        id?: string;
        action?: string;
        actor?: string;
        resource?: string;
        category?: string;
        timestamp?: string;
      };
    }
  | { ok: false; error: string; redirectTo?: string };

/** Poll-friendly: resolves pending onboarding workspace server-side; never trusts client workspace ids. */
export async function checkOnboardingFirstEventAction(
  input: z.infer<typeof CheckOnboardingFirstEventSchema>
): Promise<CheckOnboardingFirstEventResult> {
  const parsed = CheckOnboardingFirstEventSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request.' };
  }

  const session = await getFreshSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not authenticated.' };
  }
  if (!session.user.emailVerified) {
    return { ok: false, error: 'Email not verified.' };
  }
  if (!session.company?.id || session.company.createdByUserId !== session.user.id) {
    return { ok: false, error: 'Not allowed.' };
  }

  const pendingId = await findWorkspaceIdPendingProductOnboarding(session.company.id);
  if (!pendingId) {
    return { ok: false, error: 'No workspace is pending onboarding activation.' };
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: pendingId,
      companyId: session.company.id,
      deletedAt: null,
      onboardingStatus: 'PENDING'
    },
    select: { id: true, apiWorkspaceId: true }
  });

  if (!workspace?.apiWorkspaceId) {
    return { ok: false, error: 'Workspace is not provisioned yet.' };
  }

  if (!isHyreLogApiConfigured()) {
    return { ok: false, error: 'HyreLog API is not configured for this dashboard.' };
  }

  const actor = onboardingDashboardActor(session, session.company.id);

  try {
    const data = await getDashboardEvents(
      {
        limit: 1,
        offset: 0,
        sort: 'timestamp',
        order: 'asc',
        workspaceId: workspace.apiWorkspaceId
      },
      actor
    );

    if (data.total < 1 || !data.events[0]) {
      return { ok: true, hasEvent: false };
    }

    return {
      ok: true,
      hasEvent: true,
      event: mapAuditEventSummary(data.events[0])
    };
  } catch (err) {
    console.error('checkOnboardingFirstEventAction:', err);
    return { ok: false, error: 'Could not check events. Try again in a moment.' };
  }
}

export type CompleteOnboardingActivationResult =
  | { ok: true; alreadyComplete?: boolean }
  | { ok: false; error: string; redirectTo?: string };

/** Verifies at least one audit event exists for the pending workspace before completing onboarding. */
export async function completeOnboardingActivationAction(
  input: z.infer<typeof CompleteOnboardingActivationSchema>
): Promise<CompleteOnboardingActivationResult> {
  const parsed = CompleteOnboardingActivationSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: 'Invalid request.' };
  }

  const session = await getFreshSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'Not authenticated.' };
  }
  if (!session.user.emailVerified) {
    return { ok: false, error: 'Email not verified.' };
  }
  if (!session.company?.id || session.company.createdByUserId !== session.user.id) {
    return { ok: false, error: 'Not allowed.' };
  }

  const pendingId = await findWorkspaceIdPendingProductOnboarding(session.company.id);
  if (!pendingId) {
    const activated = await prisma.workspace.findFirst({
      where: {
        companyId: session.company.id,
        deletedAt: null,
        onboardingStatus: 'COMPLETE',
        firstAuditEventReceivedAt: { not: null }
      },
      orderBy: { onboardingActivationCompletedAt: 'desc' },
      select: { id: true }
    });
    if (activated) {
      const c = await cookies();
      c.set(ONBOARDING_ACTIVATION_SUCCESS_COOKIE, activated.id, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 120,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      });
      return { ok: true, alreadyComplete: true };
    }
    return { ok: false, error: 'No workspace is pending onboarding activation.' };
  }

  const workspace = await prisma.workspace.findFirst({
    where: {
      id: pendingId,
      companyId: session.company.id,
      deletedAt: null,
      company: { createdByUserId: session.user.id },
      onboardingStatus: 'PENDING'
    },
    select: { id: true, apiWorkspaceId: true, companyId: true }
  });

  if (!workspace?.apiWorkspaceId) {
    return { ok: false, error: 'Workspace is not provisioned yet.' };
  }

  if (!isHyreLogApiConfigured()) {
    return { ok: false, error: 'HyreLog API is not configured for this dashboard.' };
  }

  const actor = onboardingDashboardActor(session, session.company.id);

  let eventCount = 0;
  try {
    const data = await getDashboardEvents(
      {
        limit: 1,
        offset: 0,
        sort: 'timestamp',
        order: 'asc',
        workspaceId: workspace.apiWorkspaceId
      },
      actor
    );
    eventCount = data.total;
  } catch (err) {
    console.error('completeOnboardingActivationAction (list):', err);
    return { ok: false, error: 'Could not verify events. Try again in a moment.' };
  }

  if (eventCount < 1) {
    return { ok: false, error: 'Send at least one audit event to this workspace before completing activation.' };
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.workspace.updateMany({
      where: {
        id: workspace.id,
        companyId: session.company.id,
        deletedAt: null,
        onboardingStatus: 'PENDING'
      },
      data: {
        onboardingStatus: 'COMPLETE',
        onboardingCompletedAt: now,
        onboardingCompletedBy: session.user.id,
        firstAuditEventReceivedAt: now,
        onboardingActivationCompletedAt: now
      }
    });

    if (upd.count > 0) {
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          companyId: workspace.companyId,
          action: 'SETTINGS_UPDATE',
          resourceType: 'Workspace',
          resourceId: workspace.id,
          details: {
            onboarding: {
              action: 'activation_complete_first_event'
            }
          }
        }
      });
    }

    return upd.count;
  });

  // Do not revalidate /onboarding here: it refetches this route while the user is still on the wizard,
  // and checkOnboardingRequired() then redirects to / because onboarding is already COMPLETE.
  revalidatePath('/');
  revalidatePath('/events');

  if (updated === 0) {
    const done = await prisma.workspace.findFirst({
      where: {
        id: workspace.id,
        companyId: session.company.id,
        deletedAt: null,
        onboardingStatus: 'COMPLETE',
        firstAuditEventReceivedAt: { not: null }
      },
      select: { id: true }
    });
    if (done) {
      const c = await cookies();
      c.set(ONBOARDING_ACTIVATION_SUCCESS_COOKIE, done.id, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 120,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      });
    }
    return { ok: true, alreadyComplete: true };
  }

  const c = await cookies();
  c.set(ONBOARDING_ACTIVATION_SUCCESS_COOKIE, workspace.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 120,
    path: '/',
    secure: process.env.NODE_ENV === 'production'
  });

  return { ok: true as const };
}
