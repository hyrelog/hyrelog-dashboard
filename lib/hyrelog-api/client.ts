/**
 * HyreLog API client — server-side only.
 * Adds x-dashboard-token, x-request-id, optional actor headers, retries on 5xx.
 * Env: HYRELOG_API_URL, DASHBOARD_SERVICE_TOKEN
 */

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

function getBaseUrl(): string {
  const url = process.env.HYRELOG_API_URL;
  if (!url) throw new Error('HYRELOG_API_URL is required for HyreLog API client');
  return url.replace(/\/$/, '');
}

function getToken(): string {
  const token = process.env.DASHBOARD_SERVICE_TOKEN;
  if (!token) throw new Error('DASHBOARD_SERVICE_TOKEN is required for HyreLog API client');
  return token;
}

export interface ActorHeaders {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  companyId?: string;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | string;
  actor?: ActorHeaders;
}

function uuid(): string {
  return crypto.randomUUID();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ApiError {
  code: string;
  error?: string;
  reason?: string;
  details?: unknown;
}

export async function hyrelogRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; status: number }> {
  const baseUrl = getBaseUrl();
  const token = getToken();
  const { method = 'GET', body, actor, headers: extraHeaders = {}, ...rest } = options;

  const headers: Record<string, string> = {
    'x-dashboard-token': token,
    'x-request-id': uuid(),
    ...(extraHeaders as Record<string, string>),
  };
  // Only set JSON content-type when there is a body. Fastify rejects POSTs with
  // Content-Type: application/json and an empty body (FST_ERR_CTP_EMPTY_JSON_BODY).
  if (body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }
  if (actor?.userId) headers['x-user-id'] = actor.userId;
  if (actor?.userEmail) headers['x-user-email'] = actor.userEmail;
  if (actor?.userRole) headers['x-user-role'] = actor.userRole;
  if (actor?.companyId) headers['x-company-id'] = actor.companyId;

  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  let lastError: Error | null = null;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...rest,
        method,
        headers,
        body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      });
      lastStatus = res.status;

      const text = await res.text();
      let data: T | ApiError;
      try {
        data = text ? (JSON.parse(text) as T | ApiError) : ({} as T);
      } catch {
        data = { code: 'INVALID_JSON', error: text || res.statusText } as ApiError;
      }

      if (res.ok) {
        return { data: data as T, status: res.status };
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoff);
        continue;
      }

      throw new HyreLogApiError(res.status, data as ApiError);
    } catch (err) {
      if (err instanceof HyreLogApiError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await sleep(backoff);
      }
    }
  }

  throw lastError ?? new HyreLogApiError(lastStatus || 500, { code: 'INTERNAL_ERROR' });
}

export class HyreLogApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError
  ) {
    const msg = body?.error ?? `HyreLog API error ${status}`;
    const reason = body?.reason ? ` [${body.reason}]` : '';
    super(msg + reason);
    this.name = 'HyreLogApiError';
  }
}

export function isHyreLogApiConfigured(): boolean {
  return Boolean(process.env.HYRELOG_API_URL && process.env.DASHBOARD_SERVICE_TOKEN);
}
