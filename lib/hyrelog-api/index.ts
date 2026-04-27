/**
 * HyreLog API client — typed methods for dashboard contract.
 * Use from server actions only (requires HYRELOG_API_URL, DASHBOARD_SERVICE_TOKEN).
 */

import { hyrelogRequest, type ActorHeaders } from './client';
import type {
  ProvisionCompanyResponse,
  GetCompanyResponse,
  ProvisionWorkspaceResponse,
  GetWorkspaceResponse,
  SyncApiKeyResponse,
  RevokeKeyResponse,
  ArchiveWorkspaceResponse,
  RestoreWorkspaceResponse,
  ListCompanyApiKeysResponse,
  CreateCompanyApiKeyResponse,
  UpdateCompanyApiKeyAllowlistResponse,
} from './types';

const DASHBOARD_PREFIX = '/dashboard';

export type { ActorHeaders } from './client';
export { isHyreLogApiConfigured, HyreLogApiError } from './client';
export type { ApiError } from './client';

/** Map dashboard DataRegion to API dataRegion (API has US, EU, UK, AU). Legacy APAC maps to US. */
export function toApiDataRegion(
  preferredRegion: string | null | undefined
): 'US' | 'EU' | 'UK' | 'AU' {
  if (preferredRegion == null || preferredRegion === '') return 'US';
  const r = String(preferredRegion).toUpperCase();
  if (r === 'US' || r === 'EU' || r === 'UK' || r === 'AU') return r as 'US' | 'EU' | 'UK' | 'AU';
  if (r === 'APAC') return 'US';
  return 'US';
}

export async function provisionCompany(params: {
  dashboardCompanyId: string;
  slug: string;
  name: string;
  dataRegion: 'US' | 'EU' | 'UK' | 'AU';
  actor?: ActorHeaders;
}): Promise<ProvisionCompanyResponse> {
  const { data } = await hyrelogRequest<ProvisionCompanyResponse>(
    `${DASHBOARD_PREFIX}/companies`,
    { method: 'POST', body: params, actor: params.actor }
  );
  return data;
}

export async function getCompany(
  dashboardCompanyId: string,
  actor?: ActorHeaders
): Promise<GetCompanyResponse> {
  const { data } = await hyrelogRequest<GetCompanyResponse>(
    `${DASHBOARD_PREFIX}/companies/${encodeURIComponent(dashboardCompanyId)}`,
    { actor }
  );
  return data;
}

export async function provisionWorkspace(params: {
  dashboardWorkspaceId: string;
  dashboardCompanyId: string;
  slug: string;
  name: string;
  actor?: ActorHeaders;
}): Promise<ProvisionWorkspaceResponse> {
  const { data } = await hyrelogRequest<ProvisionWorkspaceResponse>(
    `${DASHBOARD_PREFIX}/workspaces`,
    { method: 'POST', body: params, actor: params.actor }
  );
  return data;
}

export async function getWorkspace(
  dashboardWorkspaceId: string,
  actor?: ActorHeaders
): Promise<GetWorkspaceResponse> {
  const { data } = await hyrelogRequest<GetWorkspaceResponse>(
    `${DASHBOARD_PREFIX}/workspaces/${encodeURIComponent(dashboardWorkspaceId)}`,
    { actor }
  );
  return data;
}

export async function syncApiKey(params: {
  dashboardKeyId: string;
  scope: 'ws';
  dashboardCompanyId: string;
  dashboardWorkspaceId: string;
  name: string;
  prefix: string;
  hash: string;
  revokedAt?: string | null;
  actor?: ActorHeaders;
}): Promise<SyncApiKeyResponse> {
  const body = {
    dashboardKeyId: params.dashboardKeyId,
    scope: params.scope,
    dashboardCompanyId: params.dashboardCompanyId,
    dashboardWorkspaceId: params.dashboardWorkspaceId,
    name: params.name,
    prefix: params.prefix,
    hash: params.hash,
    ...(params.revokedAt != null && { revokedAt: params.revokedAt }),
  };
  const { data } = await hyrelogRequest<SyncApiKeyResponse>(`${DASHBOARD_PREFIX}/api-keys`, {
    method: 'POST',
    body,
    actor: params.actor,
  });
  return data;
}

export async function revokeApiKey(
  dashboardKeyId: string,
  revokedAt: string,
  actor?: ActorHeaders
): Promise<RevokeKeyResponse> {
  const { data } = await hyrelogRequest<RevokeKeyResponse>(
    `${DASHBOARD_PREFIX}/api-keys/${encodeURIComponent(dashboardKeyId)}/revoke`,
    { method: 'POST', body: { revokedAt }, actor }
  );
  return data;
}

export async function listCompanyApiKeys(
  actor: ActorHeaders & { companyId: string }
): Promise<ListCompanyApiKeysResponse> {
  const { data } = await hyrelogRequest<ListCompanyApiKeysResponse>(
    `${DASHBOARD_PREFIX}/api-keys/company`,
    { actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function createCompanyApiKey(
  params: { name: string; expiresAt?: string },
  actor: ActorHeaders & { companyId: string }
): Promise<CreateCompanyApiKeyResponse> {
  const { data } = await hyrelogRequest<CreateCompanyApiKeyResponse>(
    `${DASHBOARD_PREFIX}/api-keys/company`,
    { method: 'POST', body: params, actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function revokeCompanyApiKey(
  apiKeyId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<RevokeKeyResponse> {
  const { data } = await hyrelogRequest<RevokeKeyResponse>(
    `${DASHBOARD_PREFIX}/api-keys/company/${encodeURIComponent(apiKeyId)}/revoke`,
    { method: 'POST', actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function updateCompanyApiKeyAllowlist(
  apiKeyId: string,
  params: { ipAllowlist: string[] },
  actor: ActorHeaders & { companyId: string }
): Promise<UpdateCompanyApiKeyAllowlistResponse> {
  const { data } = await hyrelogRequest<UpdateCompanyApiKeyAllowlistResponse>(
    `${DASHBOARD_PREFIX}/api-keys/company/${encodeURIComponent(apiKeyId)}/allowlist`,
    { method: 'PATCH', body: params, actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function archiveWorkspace(
  dashboardWorkspaceId: string,
  params: { archivedAt: string; revokeAllKeys?: boolean },
  actor?: ActorHeaders
): Promise<ArchiveWorkspaceResponse> {
  const { data } = await hyrelogRequest<ArchiveWorkspaceResponse>(
    `${DASHBOARD_PREFIX}/workspaces/${encodeURIComponent(dashboardWorkspaceId)}/archive`,
    { method: 'POST', body: { revokeAllKeys: true, ...params }, actor }
  );
  return data;
}

export async function restoreWorkspace(
  dashboardWorkspaceId: string,
  params: { restoredAt: string },
  actor?: ActorHeaders
): Promise<RestoreWorkspaceResponse> {
  const { data } = await hyrelogRequest<RestoreWorkspaceResponse>(
    `${DASHBOARD_PREFIX}/workspaces/${encodeURIComponent(dashboardWorkspaceId)}/restore`,
    { method: 'POST', body: params, actor }
  );
  return data;
}

export interface DashboardEventsParams {
  limit?: number;
  /** Zero-based page offset in rows (not pages). */
  offset?: number;
  sort?: 'timestamp' | 'category' | 'action' | 'id';
  order?: 'asc' | 'desc';
  from?: string;
  to?: string;
  category?: string;
  action?: string;
  projectId?: string;
  workspaceId?: string;
}

export interface DashboardEventsResponse {
  events: Array<{
    id: string;
    timestamp: string;
    category: string;
    action: string;
    actorId?: string | null;
    actorEmail?: string | null;
    actorRole?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata: unknown;
    traceId?: string | null;
    ipAddress?: string | null;
    geo?: string | null;
    userAgent?: string | null;
  }>;
  /** Total rows matching the filter (ignores limit/offset). */
  total: number;
}

export interface DashboardEventFilterOptionsParams {
  from?: string;
  to?: string;
  workspaceId?: string;
}

export interface DashboardEventFilterOptionsResponse {
  categories: string[];
  actions: string[];
}

export async function getDashboardEvents(
  params: DashboardEventsParams,
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardEventsResponse> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  if (params.sort) search.set('sort', params.sort);
  if (params.order) search.set('order', params.order);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.category) search.set('category', params.category);
  if (params.action) search.set('action', params.action);
  if (params.projectId) search.set('projectId', params.projectId);
  if (params.workspaceId) search.set('workspaceId', params.workspaceId);
  const q = search.toString();
  const path = `${DASHBOARD_PREFIX}/events${q ? `?${q}` : ''}`;
  const { data } = await hyrelogRequest<DashboardEventsResponse>(path, {
    actor: { ...actor, companyId: actor.companyId },
  });
  return data;
}

export async function getDashboardEventFilterOptions(
  params: DashboardEventFilterOptionsParams,
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardEventFilterOptionsResponse> {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.workspaceId) search.set('workspaceId', params.workspaceId);
  const q = search.toString();
  const path = `${DASHBOARD_PREFIX}/events/filter-options${q ? `?${q}` : ''}`;
  const { data } = await hyrelogRequest<DashboardEventFilterOptionsResponse>(path, {
    actor: { ...actor, companyId: actor.companyId },
  });
  return data;
}

export interface DashboardExportsResponse {
  jobs: Array<{
    id: string;
    status: string;
    source: string;
    format: string;
    rowLimit: string;
    rowsExported: string;
    createdAt: string;
    finishedAt?: string;
    errorCode?: string | null;
  }>;
}

export async function getDashboardExports(
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardExportsResponse> {
  const { data } = await hyrelogRequest<DashboardExportsResponse>(
    `${DASHBOARD_PREFIX}/exports`,
    { actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export interface DashboardWebhooksResponse {
  webhooks: Array<{
    id: string;
    url: string;
    status: string;
    events: string[];
    workspaceId: string;
    projectId?: string | null;
    createdAt: string;
  }>;
}

export interface DashboardWebhookCreateResponse {
  id: string;
  url: string;
  status: string;
  events: string[];
  workspaceId: string;
  projectId?: string | null;
  /** Returned once at creation; verify webhook signatures with this value. */
  secret: string;
  createdAt: string;
}

export async function getDashboardWebhooks(
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardWebhooksResponse> {
  const { data } = await hyrelogRequest<DashboardWebhooksResponse>(
    `${DASHBOARD_PREFIX}/webhooks`,
    { actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function createDashboardWebhook(
  params: { workspaceId: string; url: string; events?: string[]; projectId?: string | null },
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardWebhookCreateResponse> {
  const { data } = await hyrelogRequest<DashboardWebhookCreateResponse>(
    `${DASHBOARD_PREFIX}/webhooks`,
    { method: 'POST', body: params, actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function enableDashboardWebhook(
  webhookId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<{ id: string; status: string }> {
  const { data } = await hyrelogRequest<{ id: string; status: string }>(
    `${DASHBOARD_PREFIX}/webhooks/${encodeURIComponent(webhookId)}/enable`,
    { method: 'POST', actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function disableDashboardWebhook(
  webhookId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<{ id: string; status: string }> {
  const { data } = await hyrelogRequest<{ id: string; status: string }>(
    `${DASHBOARD_PREFIX}/webhooks/${encodeURIComponent(webhookId)}/disable`,
    { method: 'POST', actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export interface DashboardWebhookDeliveriesResponse {
  deliveries: Array<{
    id: string;
    eventId: string;
    attempt: number;
    status: string;
    responseStatus?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    durationMs?: number | null;
    createdAt: string;
  }>;
}

export async function getDashboardWebhookDeliveries(
  webhookId: string,
  actor: ActorHeaders & { companyId: string },
  params?: { limit?: number; status?: 'PENDING' | 'SENDING' | 'SUCCEEDED' | 'FAILED' | 'RETRY_SCHEDULED' }
): Promise<DashboardWebhookDeliveriesResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.status) search.set('status', params.status);
  const q = search.toString();
  const path = `${DASHBOARD_PREFIX}/webhooks/${encodeURIComponent(webhookId)}/deliveries${q ? `?${q}` : ''}`;
  const { data } = await hyrelogRequest<DashboardWebhookDeliveriesResponse>(path, {
    actor: { ...actor, companyId: actor.companyId },
  });
  return data;
}
