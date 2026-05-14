import { cache } from 'react';

import { listWorkspacesForUser } from '@/lib/workspaces/queries';

/**
 * Per-request dedupe: dashboard layout, `getDashboardHomeData`, and home insights all need the
 * same workspace list for workspace-only users. Wraps `listWorkspacesForUser` with React `cache`
 * so one navigation render does not repeat the membership query.
 */
export const getCachedWorkspacesForDashboardUser = cache(listWorkspacesForUser);
