import { prisma } from '@/lib/prisma';
import type { AuditAction } from '@/generated/prisma/client';

/**
 * Best-effort dashboard audit for export evidence flows. Never throws.
 */
export async function auditExportEvidenceLog(params: {
  userId: string;
  companyId: string;
  action: AuditAction;
  resourceId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        action: params.action,
        resourceType: 'ExportEvidence',
        resourceId: params.resourceId,
        details: (params.details ?? {}) as object,
      },
    });
  } catch {
    // Intentionally ignore audit failures.
  }
}

/** Best-effort audit for saved explorer view actions. Never throws. */
export async function auditSavedExplorerViewLog(params: {
  userId: string;
  companyId: string;
  action: AuditAction;
  viewId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        action: params.action,
        resourceType: 'SavedExplorerView',
        resourceId: params.viewId,
        details: (params.details ?? {}) as object,
      },
    });
  } catch {
    // Intentionally ignore audit failures.
  }
}
