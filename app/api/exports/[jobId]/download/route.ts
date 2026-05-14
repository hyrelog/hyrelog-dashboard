import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import { getFreshSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@/generated/prisma/client';
import { isCompanyAdmin, listWorkspacesForUser } from '@/lib/workspaces/queries';
import { trackExportEvent } from '@/lib/analytics/export-events';
import { sanitizeExportDownloadErrorBody } from '@/lib/exports/sanitize-upstream-error';
import { auditExportEvidenceLog } from '@/lib/exports/audit-export-evidence';

type RouteParams = { params: Promise<{ jobId: string }> };

const DEFAULT_MAX_BYTES = 256 * 1024 * 1024;

class ExportDownloadTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super('EXPORT_TOO_LARGE');
    this.name = 'ExportDownloadTooLargeError';
  }
}

async function bufferReadableStreamWithCap(
  body: ReadableStream<Uint8Array>,
  maxBytes: number
): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.byteLength) {
        const buf = Buffer.from(value);
        total += buf.length;
        if (total > maxBytes) {
          await reader.cancel();
          throw new ExportDownloadTooLargeError(maxBytes);
        }
        chunks.push(buf);
      }
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

async function buildExportWorkspaceScopeHeaders(session: {
  user: { id: string };
  company: { id: string };
  userCompany: { role: string };
}): Promise<Record<string, string>> {
  const companyId = session.company.id;
  if (isCompanyAdmin(session.userCompany.role as Parameters<typeof isCompanyAdmin>[0])) {
    return {};
  }
  const workspaces = await listWorkspacesForUser(session.user.id);
  const ids = workspaces
    .filter((w) => w.companyId === companyId)
    .map((w) => w.apiWorkspaceId)
    .filter((id): id is string => Boolean(id));
  if (!ids.length) return {};
  return { 'x-export-workspace-ids': ids.join(',') };
}

export async function GET(_request: Request, ctx: RouteParams) {
  const session = await getFreshSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.company?.id },
    select: { id: true },
  });
  if (!company || !session.company || !session.userCompany) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const trimmedJobId = jobId?.trim() ?? '';
  if (!trimmedJobId) {
    return NextResponse.json({ error: 'Missing job id', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const baseUrl = process.env.HYRELOG_API_URL?.replace(/\/$/, '');
  const token = process.env.DASHBOARD_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    return NextResponse.json({ error: 'API not configured', code: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }

  const maxBytesRaw = process.env.EXPORT_DOWNLOAD_PROXY_MAX_BYTES;
  const maxBytes =
    maxBytesRaw && Number.isFinite(Number(maxBytesRaw)) && Number(maxBytesRaw) > 0
      ? Number(maxBytesRaw)
      : DEFAULT_MAX_BYTES;

  const userEmail = session.user.email ?? '';
  const scopeHeaders = await buildExportWorkspaceScopeHeaders({
    user: { id: session.user.id },
    company: { id: session.company.id },
    userCompany: { role: session.userCompany.role },
  });

  const headers: Record<string, string> = {
    'x-dashboard-token': token,
    'x-user-id': session.user.id,
    'x-user-email': userEmail,
    'x-user-role': session.userCompany.role,
    'x-company-id': session.company.id,
    /** Avoid transparent gzip on some stacks; we need raw CSV/JSONL bytes. */
    'Accept-Encoding': 'identity',
    ...scopeHeaders,
  };

  const url = `${baseUrl}/dashboard/exports/${encodeURIComponent(trimmedJobId)}/download`;
  await auditExportEvidenceLog({
    userId: session.user.id,
    companyId: session.company.id,
    action: AuditAction.EXPORT_DOWNLOAD_STARTED,
    resourceId: trimmedJobId,
    details: {},
  });

  const upstream = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'manual',
    cache: 'no-store',
  });

  if (!upstream.ok) {
    let body: unknown = null;
    try {
      body = await upstream.json();
    } catch {
      body = { error: 'Download failed', code: 'UPSTREAM_ERROR' };
    }
    trackExportEvent('export_download_failed', { jobId: trimmedJobId, httpStatus: upstream.status });
    await auditExportEvidenceLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.EXPORT_DOWNLOAD_FAILED,
      resourceId: trimmedJobId,
      details: { httpStatus: upstream.status },
    });
    return NextResponse.json(sanitizeExportDownloadErrorBody(body), {
      status: upstream.status,
    });
  }

  if (!upstream.body) {
    trackExportEvent('export_download_failed', { jobId: trimmedJobId, reason: 'empty_body' });
    await auditExportEvidenceLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.EXPORT_DOWNLOAD_FAILED,
      resourceId: trimmedJobId,
      details: { reason: 'empty_body' },
    });
    return NextResponse.json({ error: 'Empty response', code: 'UPSTREAM_ERROR' }, { status: 502 });
  }

  const contentLengthHeader = upstream.headers.get('content-length');
  if (contentLengthHeader) {
    const n = Number(contentLengthHeader);
    if (Number.isFinite(n) && n > maxBytes) {
      trackExportEvent('export_download_failed', { jobId: trimmedJobId, reason: 'content_length_cap' });
      await auditExportEvidenceLog({
        userId: session.user.id,
        companyId: session.company.id,
        action: AuditAction.EXPORT_DOWNLOAD_FAILED,
        resourceId: trimmedJobId,
        details: { reason: 'content_length_cap' },
      });
      return NextResponse.json(
        {
          error:
            'This export is larger than the dashboard download limit. Download via the HyreLog API export endpoint instead, or raise EXPORT_DOWNLOAD_PROXY_MAX_BYTES for self-hosted dashboards.',
          code: 'EXPORT_TOO_LARGE',
          maxBytes,
        },
        { status: 413 }
      );
    }
  }

  let buffer: Buffer;
  try {
    buffer = await bufferReadableStreamWithCap(upstream.body, maxBytes);
  } catch (err) {
    if (err instanceof ExportDownloadTooLargeError) {
      trackExportEvent('export_download_failed', { jobId: trimmedJobId, reason: 'EXPORT_TOO_LARGE' });
      await auditExportEvidenceLog({
        userId: session.user.id,
        companyId: session.company.id,
        action: AuditAction.EXPORT_DOWNLOAD_FAILED,
        resourceId: trimmedJobId,
        details: { reason: 'EXPORT_TOO_LARGE' },
      });
      return NextResponse.json(
        {
          error:
            'This export exceeded the dashboard download size cap while streaming. Use the HyreLog API or increase EXPORT_DOWNLOAD_PROXY_MAX_BYTES.',
          code: 'EXPORT_TOO_LARGE',
          maxBytes: err.maxBytes,
        },
        { status: 413 }
      );
    }
    trackExportEvent('export_download_failed', { jobId: trimmedJobId, reason: 'buffer_error' });
    await auditExportEvidenceLog({
      userId: session.user.id,
      companyId: session.company.id,
      action: AuditAction.EXPORT_DOWNLOAD_FAILED,
      resourceId: trimmedJobId,
      details: { reason: 'buffer_error' },
    });
    throw err;
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const contentDisposition = upstream.headers.get('content-disposition');
  const resHeaders = new Headers();
  resHeaders.set('Content-Type', contentType);
  if (contentDisposition) resHeaders.set('Content-Disposition', contentDisposition);
  resHeaders.set('Content-Length', String(buffer.length));

  trackExportEvent('export_download_completed', { jobId: trimmedJobId, bytes: buffer.length });
  await auditExportEvidenceLog({
    userId: session.user.id,
    companyId: session.company.id,
    action: AuditAction.EXPORT_DOWNLOAD_COMPLETED,
    resourceId: trimmedJobId,
    details: { bytes: buffer.length },
  });
  return new NextResponse(new Uint8Array(buffer), { status: 200, headers: resHeaders });
}
