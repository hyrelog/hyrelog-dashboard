import { z } from 'zod';

export const LoadSchema = z.object({
  workspaceId: z.string().optional(),
  returnTo: z.string().optional()
});

export const SaveSchema = z.object({
  workspaceId: z.string(),
  returnTo: z.string().optional(),

  // Form fields
  companyName: z.string().trim().max(80).optional(),
  workspaceName: z.string().trim().min(2).max(80),
  preferredRegion: z.enum(['US', 'EU', 'UK', 'AU']).optional()
});
