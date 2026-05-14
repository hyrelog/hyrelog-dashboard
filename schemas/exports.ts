import { z } from 'zod';

/** Input from Event Explorer UI — workspace id is dashboard (Prisma) UUID; server re-resolves to HyreLog. */
export const createExplorerExportJobInputSchema = z.object({
  dashboardWorkspaceId: z.string().max(64).optional().nullable(),
  from: z.string().max(80).optional().nullable(),
  to: z.string().max(80).optional().nullable(),
  category: z.string().max(256).optional().nullable(),
  action: z.string().max(256).optional().nullable(),
  format: z.enum(['csv', 'json']),
  savedExplorerViewId: z.string().uuid().optional().nullable(),
});

export type CreateExplorerExportJobInput = z.infer<typeof createExplorerExportJobInputSchema>;

export const saveExportTemplateFromJobInputSchema = z.object({
  sourceJobId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(500).optional().nullable(),
});

export type SaveExportTemplateFromJobInput = z.infer<typeof saveExportTemplateFromJobInputSchema>;
