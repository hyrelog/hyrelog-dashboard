'use server';

import { AuditAction } from '@/generated/prisma/client';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import {
  getDashboardExportJob,
  getDashboardExportTemplates,
  getDashboardExports,
  rerunDashboardExport,
  runDashboardExportTemplate,
  saveDashboardExportTemplateFromJob,
} from '@/lib/hyrelog-api';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import { trackExportEvent } from '@/lib/analytics/export-events';
import { isCompanyAdmin, listWorkspacesForUser } from '@/lib/workspaces/queries';
import { saveExportTemplateFromJobInputSchema } from '@/schemas/exports';
import { auditExportEvidenceLog } from '@/lib/exports/audit-export-evidence';

async function exportActorForSession(session: Awaited<ReturnType<typeof requireDashboardAccess>>) {
  const companyId = session.company.id;
  const companyRole = session.userCompany.role;

  let exportWorkspaceIds: string[] | undefined;
  if (!isCompanyAdmin(companyRole)) {
    const workspaces = await listWorkspacesForUser(session.user.id);
    exportWorkspaceIds = workspaces
      .filter((w) => w.companyId === companyId)
      .map((w) => w.apiWorkspaceId)
      .filter((id): id is string => Boolean(id));
  }

  return {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: companyRole,
    companyId,
    ...(exportWorkspaceIds?.length ? { exportWorkspaceIds } : {}),
  };
}

export async function getExportsAction() {
  const session = await requireDashboardAccess('/exports');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured', jobs: [] };
  }

  try {
    const actor = await exportActorForSession(session);
    const data = await getDashboardExports(actor);
    return { ok: true as const, jobs: data.jobs };
  } catch {
    return { ok: false as const, error: 'Failed to load exports', jobs: [] };
  }
}

export async function getExportJobAction(jobId: string) {
  const session = await requireDashboardAccess('/exports');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured', job: null };
  }
  const trimmed = jobId.trim();
  if (!trimmed) {
    return { ok: false as const, error: 'Missing job id', job: null };
  }

  try {
    const actor = await exportActorForSession(session);
    const job = await getDashboardExportJob(trimmed, actor);
    return { ok: true as const, job };
  } catch {
    return { ok: false as const, error: 'Failed to load export job', job: null };
  }
}

export async function getExportTemplatesAction() {
  const session = await requireDashboardAccess('/exports');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured', templates: [] as const };
  }
  try {
    const actor = await exportActorForSession(session);
    const data = await getDashboardExportTemplates(actor);
    return { ok: true as const, templates: data.templates };
  } catch {
    return { ok: false as const, error: 'Failed to load export templates', templates: [] as const };
  }
}

export async function rerunExportAction(jobId: string) {
  const session = await requireDashboardAccess('/exports');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured' };
  }
  const trimmed = jobId.trim();
  if (!trimmed) {
    return { ok: false as const, error: 'Missing job id' };
  }
  try {
    const actor = await exportActorForSession(session);
    const out = await rerunDashboardExport(trimmed, actor);
    trackExportEvent('export_rerun', { priorJobId: trimmed, jobId: out.jobId });
    await auditExportEvidenceLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.EXPORT_RERUN,
      resourceId: out.jobId,
      details: { priorJobId: trimmed, jobId: out.jobId },
    });
    return { ok: true as const, jobId: out.jobId };
  } catch {
    return { ok: false as const, error: 'Could not re-run export' };
  }
}

export async function saveExportTemplateFromJobAction(payload: unknown) {
  const session = await requireDashboardAccess('/exports');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured' };
  }
  const parsed = saveExportTemplateFromJobInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid template' };
  }
  try {
    const actor = await exportActorForSession(session);
    const out = await saveDashboardExportTemplateFromJob(
      {
        sourceJobId: parsed.data.sourceJobId,
        name: parsed.data.name,
        description: parsed.data.description ?? undefined,
      },
      actor
    );
    trackExportEvent('export_template_saved', { templateId: out.template.id, sourceJobId: parsed.data.sourceJobId });
    await auditExportEvidenceLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.EXPORT_TEMPLATE_SAVED,
      resourceId: out.template.id,
      details: { templateId: out.template.id, sourceJobId: parsed.data.sourceJobId },
    });
    return { ok: true as const, template: out.template };
  } catch {
    return { ok: false as const, error: 'Could not save template' };
  }
}

export async function runExportTemplateAction(templateId: string) {
  const session = await requireDashboardAccess('/exports');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured' };
  }
  const trimmed = templateId.trim();
  if (!trimmed) {
    return { ok: false as const, error: 'Missing template id' };
  }
  try {
    const actor = await exportActorForSession(session);
    const out = await runDashboardExportTemplate(trimmed, actor);
    trackExportEvent('export_template_run', { templateId: trimmed, jobId: out.jobId });
    await auditExportEvidenceLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.EXPORT_TEMPLATE_RUN,
      resourceId: out.jobId,
      details: { templateId: trimmed, jobId: out.jobId },
    });
    return { ok: true as const, jobId: out.jobId };
  } catch {
    return { ok: false as const, error: 'Could not start export from template' };
  }
}
