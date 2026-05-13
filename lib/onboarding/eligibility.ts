import type {
  WorkspaceOnboardingSetupStage,
  WorkspaceOnboardingStatus,
  UserStatus
} from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';
import type { WizardStepId } from '@/lib/onboarding/constants';

/** Minimal workspace fields for onboarding state checks. */
export type WorkspaceOnboardingSlice = {
  id?: string;
  onboardingStatus: WorkspaceOnboardingStatus;
  onboardingSetupCompletedAt: Date | null;
  onboardingSetupStage: WorkspaceOnboardingSetupStage;
  onboardingActivationCompletedAt: Date | null;
  onboardingSkippedAt: Date | null;
  firstAuditEventReceivedAt: Date | null;
  apiWorkspaceId?: string | null;
};

export type OnboardingPhase = 'setup' | 'activation' | 'done';

const workspaceOnboardingSelect = {
  id: true,
  onboardingStatus: true,
  onboardingSetupCompletedAt: true,
  onboardingSetupStage: true,
  onboardingActivationCompletedAt: true,
  onboardingSkippedAt: true,
  firstAuditEventReceivedAt: true,
  apiWorkspaceId: true,
  onboardingUseCase: true
} as const;

export type WorkspaceOnboardingRow = {
  id: string;
  onboardingStatus: WorkspaceOnboardingStatus;
  onboardingSetupCompletedAt: Date | null;
  onboardingSetupStage: WorkspaceOnboardingSetupStage;
  onboardingActivationCompletedAt: Date | null;
  onboardingSkippedAt: Date | null;
  firstAuditEventReceivedAt: Date | null;
  apiWorkspaceId: string | null;
  onboardingUseCase: string | null;
};

export type OnboardingStateSummary = {
  userId: string;
  isCompanyCreator: boolean;
  companyId: string | null;
  /** Oldest workspace still in product onboarding (PENDING overall status). */
  workspacePendingProductOnboardingId: string | null;
  /** Present for company creators: onboarding fields per workspace. */
  workspaces: WorkspaceOnboardingRow[] | null;
};

/**
 * Oldest workspace where product onboarding is not finished (`onboardingStatus` still PENDING).
 * Creators are guided through setup + activation until skip or first event (Phase 3) completes onboarding.
 */
export async function findWorkspaceIdPendingProductOnboarding(companyId: string): Promise<string | null> {
  const w = await prisma.workspace.findFirst({
    where: {
      companyId,
      deletedAt: null,
      onboardingStatus: 'PENDING'
    },
    orderBy: [{ createdAt: 'asc' }],
    select: { id: true }
  });
  return w?.id ?? null;
}

/** True if this workspace was first-event completed by the company creator (for activation success flash cookie). */
export async function isCreatorFirstEventActivationCompleteWorkspace(
  companyId: string,
  creatorUserId: string,
  workspaceId: string
): Promise<boolean> {
  const w = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      companyId,
      deletedAt: null,
      onboardingStatus: 'COMPLETE',
      firstAuditEventReceivedAt: { not: null },
      company: { createdByUserId: creatorUserId }
    },
    select: { id: true }
  });
  return w != null;
}

/** @deprecated Use findWorkspaceIdPendingProductOnboarding for gates; kept for setup-only helpers. */
export async function findWorkspaceIdNeedingSetup(companyId: string): Promise<string | null> {
  const w = await prisma.workspace.findFirst({
    where: {
      companyId,
      deletedAt: null,
      onboardingStatus: 'PENDING',
      onboardingSetupCompletedAt: null
    },
    orderBy: [{ createdAt: 'asc' }],
    select: { id: true }
  });
  return w?.id ?? null;
}

export function isSetupComplete(ws: Pick<WorkspaceOnboardingSlice, 'onboardingSetupCompletedAt'>): boolean {
  return ws.onboardingSetupCompletedAt != null;
}

/**
 * Product onboarding “activation” is done: first audit event, explicit skip, or legacy `COMPLETE` status.
 */
export function isActivationComplete(ws: WorkspaceOnboardingSlice): boolean {
  if (ws.onboardingStatus === 'COMPLETE') {
    return true;
  }
  return (
    ws.firstAuditEventReceivedAt != null ||
    ws.onboardingSkippedAt != null ||
    ws.onboardingActivationCompletedAt != null
  );
}

export function getNextOnboardingStep(ws: WorkspaceOnboardingSlice): OnboardingPhase {
  if (isActivationComplete(ws)) {
    return 'done';
  }
  if (!isSetupComplete(ws)) {
    return 'setup';
  }
  return 'activation';
}

/**
 * Resolves which wizard screen the server should render first.
 * Post–API-key steps (`send-first-event`, `activation-success`) are advanced client-side only.
 */
export function getResolvedWizardServerStep(ws: WorkspaceOnboardingRow): WizardStepId {
  if (isActivationComplete(ws)) {
    return 'activation-success';
  }
  if (!isSetupComplete(ws)) {
    switch (ws.onboardingSetupStage) {
      case 'USE_CASE':
        return 'use-case';
      case 'WORKSPACE':
        return 'workspace-setup';
      case 'REGION':
        return 'region';
      case 'COMPLETE':
        return 'region';
      default:
        return 'use-case';
    }
  }
  if (!ws.apiWorkspaceId) {
    return 'provisioning';
  }
  return 'api-key';
}

/**
 * True if the creator must use `/onboarding` until product onboarding is finished.
 */
export async function isOnboardingRequired(input: {
  isCompanyCreator: boolean;
  companyId: string | null;
}): Promise<boolean> {
  if (!input.isCompanyCreator || !input.companyId) {
    return false;
  }
  return (await findWorkspaceIdPendingProductOnboarding(input.companyId)) != null;
}

/**
 * Dashboard access: blocked for creators until product onboarding completes (first audit event with server-verified activation, or explicit skip).
 */
export async function canAccessDashboard(params: {
  userId: string;
  emailVerified: boolean;
  userStatus: UserStatus;
  company: { id: string; createdByUserId: string | null } | null;
}): Promise<boolean> {
  if (!params.emailVerified) {
    return false;
  }
  if (params.userStatus === 'DEACTIVATED') {
    return false;
  }
  if (!params.company) {
    return false;
  }
  if (params.company.createdByUserId === params.userId) {
    const blocked = await findWorkspaceIdPendingProductOnboarding(params.company.id);
    if (blocked) {
      return false;
    }
  }
  return true;
}

export async function getOnboardingStateForUser(userId: string): Promise<OnboardingStateSummary> {
  const company = await prisma.company.findFirst({
    where: { createdByUserId: userId },
    select: { id: true }
  });

  if (!company) {
    return {
      userId,
      isCompanyCreator: false,
      companyId: null,
      workspacePendingProductOnboardingId: null,
      workspaces: null
    };
  }

  const [workspacePendingProductOnboardingId, workspaces] = await Promise.all([
    findWorkspaceIdPendingProductOnboarding(company.id),
    listWorkspaceOnboardingSlicesForCompany(company.id)
  ]);

  return {
    userId,
    isCompanyCreator: true,
    companyId: company.id,
    workspacePendingProductOnboardingId,
    workspaces
  };
}

export async function listWorkspaceOnboardingSlicesForCompany(
  companyId: string
): Promise<WorkspaceOnboardingRow[]> {
  return prisma.workspace.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ createdAt: 'asc' }],
    select: workspaceOnboardingSelect
  });
}
