'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import {
  createDashboardWebhook,
  disableDashboardWebhook,
  enableDashboardWebhook,
  getDashboardWebhookDeliveries,
  getDashboardWebhooks,
} from '@/lib/hyrelog-api';
import { HyreLogApiError, isHyreLogApiConfigured } from '@/lib/hyrelog-api/client';
import { prisma } from '@/lib/prisma';

/** Keep aligned with HyreLog API `WebhookEventType` / dashboard route allowlist. */
const ALLOWED_WEBHOOK_EVENT_NAMES = new Set(['AUDIT_EVENT_CREATED']);

function parseWebhookEventsText(text: string): { ok: true; events: string[] } | { ok: false; error: string } {
  const parts = text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return {
      ok: false,
      error: 'Enter at least one event name (one per line or comma-separated).',
    };
  }
  const unique = [...new Set(parts)];
  const unknown = unique.filter((e) => !ALLOWED_WEBHOOK_EVENT_NAMES.has(e));
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `Unknown event type(s): ${unknown.join(', ')}. Allowed: ${[...ALLOWED_WEBHOOK_EVENT_NAMES].sort().join(', ')}`,
    };
  }
  return { ok: true, events: unique };
}

const CreateWebhookSchema = z.object({
  workspaceId: z.string().uuid(),
  url: z.string().url(),
  projectId: z.string().uuid().optional().or(z.literal('')),
  eventsText: z.string(),
});

function toActor(session: Awaited<ReturnType<typeof requireDashboardAccess>>) {
  return {
    userId: session.user.id,
    userEmail: (session.user as { email?: string }).email ?? '',
    userRole: (session as { userCompany: { role: string } }).userCompany.role,
    companyId: (session as { company: { id: string } }).company.id,
  };
}

export async function getWebhooksAction() {
  const session = await requireDashboardAccess('/webhooks');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured', webhooks: [], workspaces: [], projects: [] };
  }
  const actor = toActor(session);

  try {
    const [data, workspaces] = await Promise.all([
      getDashboardWebhooks(actor),
      prisma.workspace.findMany({
        where: {
          companyId: actor.companyId,
          deletedAt: null,
          apiWorkspaceId: { not: null },
        },
        select: { id: true, name: true, apiWorkspaceId: true, status: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const workspaceIds = workspaces.map((w) => w.id);
    const projects =
      workspaceIds.length === 0
        ? []
        : await prisma.project.findMany({
            where: {
              workspaceId: { in: workspaceIds },
              deletedAt: null,
              apiProjectId: { not: null },
            },
            select: {
              name: true,
              slug: true,
              apiProjectId: true,
              workspace: { select: { name: true, apiWorkspaceId: true } },
            },
            orderBy: { name: 'asc' },
          });
    return {
      ok: true as const,
      webhooks: data.webhooks,
      workspaces: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        apiWorkspaceId: w.apiWorkspaceId as string,
        status: w.status,
      })),
      projects: projects.map((p) => ({
        apiProjectId: p.apiProjectId as string,
        name: p.name,
        slug: p.slug,
        workspaceName: p.workspace.name,
        apiWorkspaceId: p.workspace.apiWorkspaceId as string,
      })),
    };
  } catch (err) {
    console.error('getWebhooksAction:', err);
    return { ok: false as const, error: 'Failed to load webhooks', webhooks: [], workspaces: [], projects: [] };
  }
}

export async function getWebhookDeliveriesAction(webhookId: string, limit = 20) {
  const session = await requireDashboardAccess('/webhooks');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured', deliveries: [] };
  }

  if (!webhookId) {
    return { ok: false as const, error: 'Webhook id is required', deliveries: [] };
  }

  const actor = toActor(session);

  try {
    const data = await getDashboardWebhookDeliveries(webhookId, actor, { limit });
    return { ok: true as const, deliveries: data.deliveries };
  } catch (err) {
    console.error('getWebhookDeliveriesAction:', err);
    if (err instanceof HyreLogApiError) {
      const detail = err.body?.error ?? err.message;
      return { ok: false as const, error: `Failed to load webhook deliveries (${err.status}): ${detail}`, deliveries: [] };
    }
    return { ok: false as const, error: 'Failed to load webhook deliveries', deliveries: [] };
  }
}

export async function createWebhookAction(input: z.infer<typeof CreateWebhookSchema>) {
  const parsed = CreateWebhookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const session = await requireDashboardAccess('/webhooks');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured' };
  }
  const actor = toActor(session);

  const parsedEvents = parseWebhookEventsText(parsed.data.eventsText);
  if (!parsedEvents.ok) {
    return { ok: false as const, error: parsedEvents.error };
  }

  try {
    const created = await createDashboardWebhook(
      {
        workspaceId: parsed.data.workspaceId,
        url: parsed.data.url,
        events: parsedEvents.events,
        projectId: parsed.data.projectId ? parsed.data.projectId : null,
      },
      actor
    );
    revalidatePath('/webhooks');
    return { ok: true as const, secret: created.secret };
  } catch (err) {
    const message = err instanceof HyreLogApiError
      ? `Create webhook failed (${err.status}): ${err.body?.error ?? err.message}`
      : err instanceof Error
        ? err.message
        : 'Failed to create webhook';
    return { ok: false as const, error: message };
  }
}

export async function setWebhookStatusAction(webhookId: string, status: 'ACTIVE' | 'DISABLED') {
  if (!webhookId) return { ok: false as const, error: 'Webhook id is required.' };
  const session = await requireDashboardAccess('/webhooks');
  if (!isHyreLogApiConfigured()) {
    return { ok: false as const, error: 'API not configured' };
  }
  const actor = toActor(session);
  try {
    if (status === 'ACTIVE') {
      await enableDashboardWebhook(webhookId, actor);
    } else {
      await disableDashboardWebhook(webhookId, actor);
    }
    revalidatePath('/webhooks');
    return { ok: true as const };
  } catch (err) {
    const message = err instanceof HyreLogApiError
      ? `Update webhook failed (${err.status}): ${err.body?.error ?? err.message}`
      : err instanceof Error
        ? err.message
        : 'Failed to update webhook';
    return { ok: false as const, error: message };
  }
}
