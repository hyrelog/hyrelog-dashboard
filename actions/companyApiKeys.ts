'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { createCompanyApiKey, revokeCompanyApiKey, updateCompanyApiKeyAllowlist } from '@/lib/hyrelog-api';

const CreateCompanyKeySchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(100, 'Name is too long'),
  expiresAt: z.string().datetime().optional(),
});

const UpdateCompanyKeyAllowlistSchema = z.object({
  apiKeyId: z.string().min(1, 'API key id is required'),
  ipAllowlist: z.array(z.string().trim().min(1).max(128)).max(100),
});

function getActor() {
  const session = requireDashboardAccess('/company-settings');
  return session;
}

export async function createCompanyApiKeyAction(input: z.infer<typeof CreateCompanyKeySchema>) {
  const parsed = CreateCompanyKeySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }

  const session = await getActor();
  const companyId = (session as { company: { id: string } }).company.id;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  if (!['OWNER', 'ADMIN'].includes(userRole)) {
    return { ok: false as const, error: 'Only owners and admins can manage company API keys.' };
  }

  const actor = {
    companyId,
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole,
  };

  try {
    const created = await createCompanyApiKey(
      {
        name: parsed.data.name.trim(),
        ...(parsed.data.expiresAt ? { expiresAt: parsed.data.expiresAt } : {}),
      },
      actor
    );
    revalidatePath('/company-settings');
    return {
      ok: true as const,
      key: {
        id: created.id,
        fullKey: created.apiKey,
        prefix: created.prefix,
        createdAt: created.createdAt,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false as const, error: message };
  }
}

export async function revokeCompanyApiKeyAction(apiKeyId: string) {
  if (!apiKeyId) return { ok: false as const, error: 'API key id is required.' };

  const session = await getActor();
  const companyId = (session as { company: { id: string } }).company.id;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  if (!['OWNER', 'ADMIN'].includes(userRole)) {
    return { ok: false as const, error: 'Only owners and admins can manage company API keys.' };
  }

  const actor = {
    companyId,
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole,
  };

  try {
    await revokeCompanyApiKey(apiKeyId, actor);
    revalidatePath('/company-settings');
    return { ok: true as const };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false as const, error: message };
  }
}

export async function updateCompanyApiKeyAllowlistAction(
  input: z.infer<typeof UpdateCompanyKeyAllowlistSchema>
) {
  const parsed = UpdateCompanyKeyAllowlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }

  const session = await getActor();
  const companyId = (session as { company: { id: string } }).company.id;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  if (!['OWNER', 'ADMIN'].includes(userRole)) {
    return { ok: false as const, error: 'Only owners and admins can manage company API keys.' };
  }

  const actor = {
    companyId,
    userId: session.user.id,
    userEmail: session.user.email ?? undefined,
    userRole,
  };

  try {
    await updateCompanyApiKeyAllowlist(
      parsed.data.apiKeyId,
      { ipAllowlist: parsed.data.ipAllowlist },
      actor
    );
    revalidatePath('/company-settings');
    revalidatePath('/company-settings/webhooks');
    revalidatePath('/company-settings/api-access');
    return { ok: true as const };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false as const, error: message };
  }
}

