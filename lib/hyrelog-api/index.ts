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

export interface DashboardEventHistogramParams {
  from: string;
  to: string;
  interval: 'minute' | 'hour' | 'day';
  groupBy?: 'none' | 'category' | 'action' | 'workspace' | 'region';
  workspaceId?: string;
  projectId?: string;
  category?: string;
  action?: string;
}

export interface DashboardEventHistogramResponse {
  buckets: Array<{
    start: string;
    end: string;
    count: number;
    groups?: Array<{ key: string; count: number }>;
  }>;
  meta: {
    from: string;
    to: string;
    interval: 'minute' | 'hour' | 'day';
    groupBy: 'none' | 'category' | 'action' | 'workspace' | 'region';
    partial: boolean;
  };
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

export async function getDashboardEventHistogram(
  params: DashboardEventHistogramParams,
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardEventHistogramResponse> {
  const search = new URLSearchParams();
  search.set('from', params.from);
  search.set('to', params.to);
  search.set('interval', params.interval);
  search.set('groupBy', params.groupBy ?? 'none');
  if (params.workspaceId) search.set('workspaceId', params.workspaceId);
  if (params.projectId) search.set('projectId', params.projectId);
  if (params.category) search.set('category', params.category);
  if (params.action) search.set('action', params.action);
  const q = search.toString();
  const path = `${DASHBOARD_PREFIX}/events/metrics/histogram?${q}`;
  const { data } = await hyrelogRequest<DashboardEventHistogramResponse>(path, {
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

export type DashboardExportFiltersSummary = {
  from?: string;
  to?: string;
  category?: string;
  action?: string;
  workspaceId?: string;
};

export interface DashboardExportJobSummary {
  id: string;
  status: string;
  source: string;
  format: string;
  rowLimit: string;
  rowsExported: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string | null;
  failureSummary?: string | null;
  requestedByType: string;
  requestedById: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
  explorerDashboardWorkspaceId: string | null;
  filtersSummary: DashboardExportFiltersSummary;
}

export interface DashboardExportsResponse {
  jobs: DashboardExportJobSummary[];
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

export interface DashboardExportJobDetail extends DashboardExportJobSummary {
  downloadHint: 'ready_to_stream' | 'in_progress' | 'completed_no_repeat_download' | 'unavailable';
  evidence: { jobId: string; companyScoped: boolean; requestedVia: 'dashboard' | 'api' };
}

export async function getDashboardExportJob(
  jobId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardExportJobDetail> {
  const { data } = await hyrelogRequest<DashboardExportJobDetail>(
    `${DASHBOARD_PREFIX}/exports/${encodeURIComponent(jobId)}`,
    { actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

/** Response from GET /dashboard/exports/capabilities (no side effects). */
export interface DashboardExportCapabilitiesResponse {
  createFilteredExport: boolean;
}

export async function getDashboardExportCapabilities(
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardExportCapabilitiesResponse> {
  const { data } = await hyrelogRequest<DashboardExportCapabilitiesResponse>(
    `${DASHBOARD_PREFIX}/exports/capabilities`,
    { actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export type DashboardExportCreateBody = {
  format: 'JSONL' | 'CSV';
  filters?: {
    from?: string;
    to?: string;
    category?: string;
    action?: string;
    workspaceId?: string;
  };
  limit?: number;
  /** Merged with saved view query on API (body filters override). */
  savedExplorerViewId?: string;
};

export async function createDashboardExport(
  body: DashboardExportCreateBody,
  actor: ActorHeaders & { companyId: string }
): Promise<{ jobId: string; status: string }> {
  const { data } = await hyrelogRequest<{ jobId: string; status: string }>(`${DASHBOARD_PREFIX}/exports`, {
    method: 'POST',
    body: body as unknown as Record<string, unknown>,
    actor: { ...actor, companyId: actor.companyId },
  });
  return data;
}

export type SavedExplorerViewSummary = {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string | null;
  isDefault: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type SavedExplorerViewDetail = SavedExplorerViewSummary & {
  query: Record<string, unknown>;
};

export interface SavedExplorerViewsListResponse {
  views: SavedExplorerViewSummary[];
}

export async function getSavedExplorerViews(
  actor: ActorHeaders & { companyId: string }
): Promise<SavedExplorerViewsListResponse> {
  const { data } = await hyrelogRequest<SavedExplorerViewsListResponse>(
    `${DASHBOARD_PREFIX}/explorer/views`,
    { actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function getSavedExplorerView(
  viewId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<{ view: SavedExplorerViewDetail }> {
  const { data } = await hyrelogRequest<{ view: SavedExplorerViewDetail }>(
    `${DASHBOARD_PREFIX}/explorer/views/${encodeURIComponent(viewId)}`,
    { actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function createSavedExplorerView(
  body: {
    name: string;
    description?: string;
    query: unknown;
    workspaceId?: string | null;
    isDefault?: boolean;
  },
  actor: ActorHeaders & { companyId: string }
): Promise<{ view: SavedExplorerViewDetail }> {
  const { data } = await hyrelogRequest<{ view: SavedExplorerViewDetail }>(
    `${DASHBOARD_PREFIX}/explorer/views`,
    {
      method: 'POST',
      body: body as unknown as Record<string, unknown>,
      actor: { ...actor, companyId: actor.companyId },
    }
  );
  return data;
}

export async function updateSavedExplorerView(
  viewId: string,
  body: {
    name?: string;
    description?: string | null;
    query?: unknown;
    workspaceId?: string | null;
    isDefault?: boolean;
  },
  actor: ActorHeaders & { companyId: string }
): Promise<{ view: SavedExplorerViewDetail }> {
  const { data } = await hyrelogRequest<{ view: SavedExplorerViewDetail }>(
    `${DASHBOARD_PREFIX}/explorer/views/${encodeURIComponent(viewId)}`,
    {
      method: 'PATCH',
      body: body as unknown as Record<string, unknown>,
      actor: { ...actor, companyId: actor.companyId },
    }
  );
  return data;
}

export async function deleteSavedExplorerView(
  viewId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<void> {
  await hyrelogRequest<unknown>(
    `${DASHBOARD_PREFIX}/explorer/views/${encodeURIComponent(viewId)}`,
    { method: 'DELETE', actor: { ...actor, companyId: actor.companyId } }
  );
}

export type RunSavedExplorerViewResponse = {
  view: Pick<SavedExplorerViewSummary, 'id' | 'name' | 'description' | 'workspaceId' | 'isDefault'>;
  query: Record<string, unknown>;
};

export async function runSavedExplorerView(
  viewId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<RunSavedExplorerViewResponse> {
  const { data } = await hyrelogRequest<RunSavedExplorerViewResponse>(
    `${DASHBOARD_PREFIX}/explorer/views/${encodeURIComponent(viewId)}/run`,
    { method: 'POST', actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function rerunDashboardExport(
  jobId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<{ jobId: string; status: string }> {
  const { data } = await hyrelogRequest<{ jobId: string; status: string }>(
    `${DASHBOARD_PREFIX}/exports/${encodeURIComponent(jobId)}/rerun`,
    { method: 'POST', actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export type DashboardExportTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  format: string;
  source: string;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface DashboardExportTemplatesResponse {
  templates: DashboardExportTemplateSummary[];
}

export async function getDashboardExportTemplates(
  actor: ActorHeaders & { companyId: string }
): Promise<DashboardExportTemplatesResponse> {
  const { data } = await hyrelogRequest<DashboardExportTemplatesResponse>(
    `${DASHBOARD_PREFIX}/export-templates`,
    { actor: { ...actor, companyId: actor.companyId } }
  );
  return data;
}

export async function saveDashboardExportTemplateFromJob(
  body: { sourceJobId: string; name: string; description?: string | null },
  actor: ActorHeaders & { companyId: string }
): Promise<{ template: DashboardExportTemplateSummary }> {
  const { data } = await hyrelogRequest<{ template: DashboardExportTemplateSummary }>(
    `${DASHBOARD_PREFIX}/export-templates`,
    {
      method: 'POST',
      body: body as unknown as Record<string, unknown>,
      actor: { ...actor, companyId: actor.companyId },
    }
  );
  return data;
}

export async function runDashboardExportTemplate(
  templateId: string,
  actor: ActorHeaders & { companyId: string }
): Promise<{ jobId: string; status: string }> {
  const { data } = await hyrelogRequest<{ jobId: string; status: string }>(
    `${DASHBOARD_PREFIX}/export-templates/${encodeURIComponent(templateId)}/run`,
    { method: 'POST', actor: { ...actor, companyId: actor.companyId } }
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
  params: { workspaceId: string; url: string; events?: string[]; projectId?: string | null; customSecret?: string },
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
