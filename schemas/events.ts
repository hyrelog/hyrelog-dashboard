import { z } from 'zod';

/**
 * Whitelisted `/events` query keys only. Unknown keys are omitted before parse.
 * All fields are optional strings so `safeParse` does not fail on malformed values;
 * callers normalize with `parseEventsExplorerSearchParams` in `lib/events/explorer-url.ts`.
 */
export const eventsExplorerQuerySchema = z
  .object({
    workspaceId: z.string().max(64).optional(),
    /** Active saved explorer view id (dashboard); merged filters live in other params. */
    savedView: z.string().max(40).optional(),
    from: z.string().max(80).optional(),
    to: z.string().max(80).optional(),
    category: z.string().max(256).optional(),
    action: z.string().max(256).optional(),
    sort: z.string().max(32).optional(),
    order: z.string().max(8).optional(),
    page: z.string().max(40).optional(),
    pageSize: z.string().max(16).optional(),
    ref: z.string().max(32).optional(),
  })
  .strip();

export type EventsExplorerQueryInput = z.input<typeof eventsExplorerQuerySchema>;
