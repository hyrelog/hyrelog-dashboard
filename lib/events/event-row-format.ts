export type ExplorerEventRow = {
  id: string;
  timestamp: string;
  category: string;
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: unknown;
};

/** Short monospace-friendly id for dense tables. */
export function formatEventIdShort(id: string, max = 12): string {
  if (!id) return '—';
  if (id.length <= max) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function formatActorCell(ev: Pick<ExplorerEventRow, 'actorEmail' | 'actorId' | 'actorRole'>): string {
  const email = ev.actorEmail?.trim();
  if (email) return email;
  const id = ev.actorId?.trim();
  if (id) return id;
  const role = ev.actorRole?.trim();
  if (role) return role;
  return '—';
}

export function formatResourceCell(ev: Pick<ExplorerEventRow, 'resourceType' | 'resourceId'>): string {
  const t = ev.resourceType?.trim();
  const id = ev.resourceId?.trim();
  if (t && id) return `${t}:${id}`;
  if (t) return t;
  if (id) return id;
  return '—';
}

export type IntegrityHint = {
  hash?: string;
  prevHash?: string;
  chainStatus?: string;
};

/**
 * Best-effort integrity fields from metadata (shape varies by ingestion version).
 * Does not fabricate values.
 */
export function extractIntegrityHints(metadata: unknown): IntegrityHint | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const hash =
    typeof m.eventHash === 'string'
      ? m.eventHash
      : typeof m.hash === 'string'
        ? m.hash
        : typeof m.integrityHash === 'string'
          ? m.integrityHash
          : undefined;
  const prevHash =
    typeof m.prevHash === 'string'
      ? m.prevHash
      : typeof m.previousHash === 'string'
        ? m.previousHash
        : undefined;
  const chainStatus =
    typeof m.integrityStatus === 'string'
      ? m.integrityStatus
      : typeof m.chainStatus === 'string'
        ? m.chainStatus
        : undefined;
  if (!hash && !prevHash && !chainStatus) return null;
  return { hash, prevHash, chainStatus };
}

export function formatIntegrityBadge(hint: IntegrityHint | null): string {
  if (!hint) return '';
  if (hint.chainStatus) return hint.chainStatus;
  if (hint.hash && hint.prevHash) return 'chained';
  if (hint.hash) return 'has hash';
  return '';
}

/** Optional labels from event metadata when the list API omits top-level workspace/project fields. */
export function extractExplorerRowContext(metadata: unknown): { workspace?: string; project?: string } {
  if (!metadata || typeof metadata !== 'object') return {};
  const m = metadata as Record<string, unknown>;
  const project =
    typeof m.projectName === 'string'
      ? m.projectName.trim()
      : typeof m.project === 'string'
        ? (m.project as string).trim()
        : typeof m.projectSlug === 'string'
          ? m.projectSlug.trim()
          : typeof m.projectId === 'string'
            ? m.projectId.trim()
            : undefined;
  const workspace =
    typeof m.workspaceName === 'string'
      ? m.workspaceName.trim()
      : typeof m.workspace === 'string'
        ? (m.workspace as string).trim()
        : typeof m.workspaceSlug === 'string'
          ? m.workspaceSlug.trim()
          : undefined;
  return {
    ...(workspace ? { workspace } : {}),
    ...(project ? { project } : {}),
  };
}
