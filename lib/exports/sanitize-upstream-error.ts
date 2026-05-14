/**
 * Shapes HyreLog API JSON errors for browser-facing export download responses.
 * Drops unknown keys (stacks, internal details, HTML error pages parsed as strings).
 */
export function sanitizeExportDownloadErrorBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Download failed', code: 'UPSTREAM_ERROR' };
  }
  const o = body as Record<string, unknown>;
  const code = typeof o.code === 'string' && o.code.length <= 64 ? o.code : 'UPSTREAM_ERROR';
  const errRaw = typeof o.error === 'string' ? o.error : 'Download failed';
  const error = errRaw.length > 500 ? 'Download failed' : errRaw;
  const out: Record<string, unknown> = { error, code };
  if (typeof o.maxBytes === 'number' && Number.isFinite(o.maxBytes)) {
    out.maxBytes = o.maxBytes;
  }
  return out;
}
