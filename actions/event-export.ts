'use server';

/**
 * Filtered event exports call POST /dashboard/exports. Deploy hyrelog-api with that route
 * (and GET /dashboard/exports/capabilities) before or alongside this dashboard so the UI
 * can disable export when the API contract is missing.
 */

import { AuditAction } from '@/generated/prisma/client';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { createDashboardExport } from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import { userMessageForCreateDashboardExportFailure } from '@/lib/hyrelog-api/dashboard-filtered-export-compat';
import { buildDashboardExportCreateBody } from '@/lib/events/explorer-export-request';
import { resolveExplorerHyrelogWorkspace } from '@/lib/events/resolve-explorer-workspace';
import { createExplorerExportJobInputSchema } from '@/schemas/exports';
import { trackExportEvent } from '@/lib/analytics/export-events';
import type { CompanyRole } from '@/types/dashboard';
import { auditExportEvidenceLog } from '@/lib/exports/audit-export-evidence';

export async function createExplorerExportJobAction(payload: unknown) {
  const session = await requireDashboardAccess('/events');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured' };
  }

  const parsed = createExplorerExportJobInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid export request' };
  }

  const companyId = session.company.id;
  const companyRole = session.userCompany.role as CompanyRole;

  const resolved = await resolveExplorerHyrelogWorkspace({
    companyId,
    userId: session.user.id,
    companyRole,
    dashboardWorkspaceIdFromUrl: parsed.data.dashboardWorkspaceId?.trim() || null,
  });

  if (!resolved.ok) {
    return {
      ok: false as const,
      error: 'You do not have access to export events with the selected workspace.',
    };
  }

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: companyRole,
    companyId,
  };

  const body = buildDashboardExportCreateBody({
    hyrelogWorkspaceId: resolved.hyrelogWorkspaceId,
    explorer: {
      from: parsed.data.from?.trim() ?? '',
      to: parsed.data.to?.trim() ?? '',
      category: parsed.data.category?.trim() ?? '',
      action: parsed.data.action?.trim() ?? '',
    },
    format: parsed.data.format,
    savedExplorerViewId: parsed.data.savedExplorerViewId?.trim() || null,
  });

  try {
    const out = await createDashboardExport(body, actor);
    trackExportEvent('export_created', { jobId: out.jobId, source: 'explorer' });
    await auditExportEvidenceLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.EXPORT_CREATED,
      resourceId: out.jobId,
      details: { jobId: out.jobId, workspaceId: resolved.hyrelogWorkspaceId, source: 'explorer' },
    });
    return { ok: true as const, jobId: out.jobId };
  } catch (err) {
    return { ok: false as const, error: userMessageForCreateDashboardExportFailure(err) };
  }
}
