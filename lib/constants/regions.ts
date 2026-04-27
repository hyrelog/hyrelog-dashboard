/**
 * Single source of truth for DataRegion (Prisma enum) display labels.
 * Used by onboarding, workspaces list, filters, etc. When adding a new region
 * in schema.prisma, add one entry here and it will appear everywhere.
 */
export const DATA_REGION_OPTIONS: { value: string; label: string }[] = [
  { value: 'AU', label: 'Australia' },
  { value: 'EU', label: 'Europe' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'US', label: 'United States' }
];

export function getDataRegionLabel(value: string | null | undefined): string {
  if (value == null || value === '') return 'N/A';
  const opt = DATA_REGION_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}

/**
 * WorkspaceStatus (Prisma enum) display labels for filters and tables.
 */
export const WORKSPACE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' }
];

export function getWorkspaceStatusLabel(value: string | null | undefined): string {
  if (value == null || value === '') return 'N/A';
  const opt = WORKSPACE_STATUS_OPTIONS.find((o) => o.value === value);
  return opt?.label ?? value;
}
