/**
 * Types for HyreLog Dashboard API contract responses/bodies.
 */

export interface ProvisionCompanyResponse {
  apiCompanyId: string;
  dashboardCompanyId: string;
  dataRegion: string;
  status: string;
  created: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetCompanyResponse {
  exists: boolean;
  apiCompanyId?: string;
  dataRegion?: string;
  updatedAt?: string;
}

export interface ProvisionWorkspaceResponse {
  apiWorkspaceId: string;
  dashboardWorkspaceId: string;
  apiCompanyId: string;
  created: boolean;
  status: string;
}

export interface GetWorkspaceResponse {
  exists: boolean;
  apiWorkspaceId?: string;
  apiCompanyId?: string;
  status?: string;
}

export interface SyncApiKeyResponse {
  apiKeyId: string;
  created: boolean;
  scopeValidated: boolean;
}

export interface RevokeKeyResponse {
  ok: boolean;
}

export interface ArchiveWorkspaceResponse {
  ok: boolean;
  keysRevokedCount: number;
}

export interface RestoreWorkspaceResponse {
  ok: boolean;
}

export interface CompanyApiKeySummary {
  id: string;
  prefix: string;
  name: string;
  labels: string[];
  status: string;
  ipAllowlist: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListCompanyApiKeysResponse {
  items: CompanyApiKeySummary[];
}

export interface CreateCompanyApiKeyResponse {
  id: string;
  apiKey: string;
  prefix: string;
  scope: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

export type UpdateCompanyApiKeyAllowlistResponse = CompanyApiKeySummary;
