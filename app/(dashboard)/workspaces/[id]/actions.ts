'use server';

import GithubSlugger from 'github-slugger';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { z } from 'zod';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { getWorkspaceDetailForUser } from '@/lib/workspaces/workspace-detail-queries';
import { uniqueProjectSlug } from '@/lib/workspaces/slug';
import { hashPassword } from '@/lib/argon2';
import {
  archiveWorkspaceAndSync,
  restoreWorkspaceAndSync,
  revokeKeyAndSync,
  createKeyAndSync,
  syncKeyAfterCreate,
  provisionWorkspaceAndStore,
} from '@/actions/provisioning';
import { isHyreLogApiConfigured } from '@/lib/hyrelog-api';
import { isApiKeySyncConfigured } from '@/lib/hyrelog-api/key-format';

const RenameWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long')
});

const ArchiveWorkspaceSchema = z.object({
  workspaceId: z.string().uuid()
});

const RestoreWorkspaceSchema = z.object({
  workspaceId: z.string().uuid()
});

const DeleteWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  confirmSlug: z.string().trim().min(1, 'Type the workspace slug to confirm')
});

const CreateKeySchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long')
});

const RenameKeySchema = z.object({
  keyId: z.string().uuid(),
  name: z.string().trim().min(2).max(80)
});

const RevokeKeySchema = z.object({
  keyId: z.string().uuid()
});

const UpdateRegionSchema = z.object({
  workspaceId: z.string().uuid(),
  preferredRegion: z.enum(['US', 'EU', 'UK', 'AU'])
});

const CreateProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long')
});

const RenameProjectSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(2).max(80)
});

const DeleteProjectSchema = z.object({
  projectId: z.string().uuid()
});

async function getAccess(workspaceId: string) {
  const session = await requireDashboardAccess(`/workspaces/${workspaceId}`);
  const company = (session as { company: { id: string; preferredRegion: string; slug?: string } }).company;
  const payload = await getWorkspaceDetailForUser(workspaceId, {
    user: { id: session.user.id },
    company: { id: company.id, preferredRegion: company.preferredRegion, slug: company.slug },
    userCompany: { role: session.userCompany.role }
  });
  return { session, company, payload };
}

/** Provision this workspace in the HyreLog API (sets apiWorkspaceId). Call when status is "Not provisioned". */
export async function provisionWorkspaceAction(workspaceId: string): Promise<
  | { ok: true; apiWorkspaceId: string }
  | { ok: false; error: string }
> {
  const parsed = z.string().uuid().safeParse(workspaceId);
  if (!parsed.success) return { ok: false, error: 'Invalid workspace.' };
  const { session, payload } = await getAccess(parsed.data);
  if (!payload) return { ok: false, error: 'Not authorized.' };
  if (!payload.canAdmin) return { ok: false, error: 'Only admins can provision the workspace.' };
  const sessionWithCompany = session as { user: { id: string; email: string }; userCompany: { role: string } };
  return provisionWorkspaceAndStore(parsed.data, {
    userId: sessionWithCompany.user.id,
    userEmail: sessionWithCompany.user.email ?? null,
    userRole: sessionWithCompany.userCompany.role,
  });
}

export async function renameWorkspaceAction(
  input: z.infer<typeof RenameWorkspaceSchema>
) {
  const parsed = RenameWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { workspaceId, name } = parsed.data;
  const { session, company, payload } = await getAccess(workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canAdmin) return { ok: false as const, error: 'Not allowed.' };

  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, companyId: company.id, deletedAt: null },
    select: { id: true, name: true, status: true }
  });
  if (!ws) return { ok: false as const, error: 'Workspace not found.' };
  if (ws.status !== 'ACTIVE') return { ok: false as const, error: 'Workspace is archived. Restore it to make changes.' };

  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: ws.id },
      data: { name, isAutoNamed: false }
    });
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: company.id,
        action: 'WORKSPACE_UPDATED',
        resourceType: 'Workspace',
        resourceId: ws.id,
        details: { from: { name: ws.name }, to: { name } }
      }
    });
  });

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath('/workspaces');
  return { ok: true as const };
}

export async function archiveWorkspaceAction(
  input: z.infer<typeof ArchiveWorkspaceSchema>
) {
  const parsed = ArchiveWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { workspaceId } = parsed.data;
  const { session, company, payload } = await getAccess(workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canAdmin) return { ok: false as const, error: 'Not allowed.' };

  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, companyId: company.id, deletedAt: null },
    select: { id: true, status: true }
  });
  if (!ws) return { ok: false as const, error: 'Workspace not found.' };
  if (ws.status !== 'ACTIVE') return { ok: false as const, error: 'Workspace is not active.' };

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role,
  };
  const result = await archiveWorkspaceAndSync(workspaceId, actor);
  if (!result.ok) return { ok: false as const, error: result.error };

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'WORKSPACE_UPDATED',
      resourceType: 'Workspace',
      resourceId: ws.id,
      details: {
        workspace: {
          action: 'archive',
          from: { status: 'ACTIVE' },
          to: { status: 'ARCHIVED' },
          provisioned: payload.regionLocked,
        }
      }
    }
  });

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath('/workspaces');
  return { ok: true as const };
}

export async function restoreWorkspaceAction(
  input: z.infer<typeof RestoreWorkspaceSchema>
) {
  const parsed = RestoreWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { workspaceId } = parsed.data;
  const { session, company, payload } = await getAccess(workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canAdmin) return { ok: false as const, error: 'Not allowed.' };

  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, companyId: company.id, deletedAt: null },
    select: { id: true, status: true }
  });
  if (!ws) return { ok: false as const, error: 'Workspace not found.' };
  if (ws.status !== 'ARCHIVED') return { ok: false as const, error: 'Workspace is not archived.' };

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role,
  };
  const result = await restoreWorkspaceAndSync(workspaceId, actor);
  if (!result.ok) return { ok: false as const, error: result.error };

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'WORKSPACE_UPDATED',
      resourceType: 'Workspace',
      resourceId: ws.id,
      details: {
        workspace: { action: 'restore', from: { status: 'ARCHIVED' }, to: { status: 'ACTIVE' } }
      }
    }
  });

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath('/workspaces');
  return { ok: true as const };
}

export async function deleteWorkspaceAction(
  input: z.infer<typeof DeleteWorkspaceSchema>
) {
  const parsed = DeleteWorkspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { workspaceId, confirmSlug } = parsed.data;
  const { session, company, payload } = await getAccess(workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canAdmin) return { ok: false as const, error: 'Not allowed.' };
  if (payload.regionLocked) {
    return { ok: false as const, error: "Provisioned workspaces can't be deleted. Contact support." };
  }

  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, companyId: company.id, deletedAt: null },
    select: { id: true, slug: true }
  });
  if (!ws) return { ok: false as const, error: 'Workspace not found.' };
  if (confirmSlug !== ws.slug) {
    return { ok: false as const, error: 'Slug does not match. Type the workspace slug to confirm.' };
  }

  await prisma.workspace.update({
    where: { id: ws.id },
    data: { deletedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'SETTINGS_UPDATE',
      resourceType: 'Workspace',
      resourceId: ws.id,
      details: { workspace: { action: 'delete', slug: ws.slug } }
    }
  });

  revalidatePath('/workspaces');
  return { ok: true as const };
}

export async function updateWorkspaceRegionAction(
  input: z.infer<typeof UpdateRegionSchema>
) {
  const parsed = UpdateRegionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { workspaceId, preferredRegion } = parsed.data;
  const { session, company, payload } = await getAccess(workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canAdmin) return { ok: false as const, error: 'Not allowed.' };
  if (payload.regionLocked) return { ok: false as const, error: 'Region is locked after provisioning.' };

  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, companyId: company.id, deletedAt: null },
    select: { id: true, apiWorkspaceId: true, status: true }
  });
  if (!ws) return { ok: false as const, error: 'Workspace not found.' };
  if (ws.status !== 'ACTIVE') return { ok: false as const, error: 'Workspace is archived. Restore it to make changes.' };
  if (ws.apiWorkspaceId) return { ok: false as const, error: 'Region cannot be changed after provisioning.' };

  await prisma.workspace.update({
    where: { id: ws.id },
    data: { preferredRegion }
  });

  revalidatePath(`/workspaces/${workspaceId}`);
  return { ok: true as const };
}

export async function createProjectAction(
  input: z.infer<typeof CreateProjectSchema>
) {
  const parsed = CreateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { workspaceId, name } = parsed.data;
  const { session, company, payload } = await getAccess(workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canWrite) return { ok: false as const, error: 'Not allowed.' };
  if (payload.workspace.status !== 'ACTIVE') {
    return { ok: false as const, error: 'Workspace is archived. Restore it to create projects.' };
  }

  const slug = await uniqueProjectSlug(workspaceId, name.trim());
  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: name.trim(),
      slug
    },
    select: { id: true }
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'SETTINGS_UPDATE',
      resourceType: 'Project',
      resourceId: project.id,
      details: { event: 'PROJECT_CREATED', workspaceId, name: name.trim(), slug }
    }
  });

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath('/workspaces');
  return { ok: true as const, id: project.id };
}

export async function renameProjectAction(
  input: z.infer<typeof RenameProjectSchema>
) {
  const parsed = RenameProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { projectId, name } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, workspaceId: true, name: true, slug: true }
  });
  if (!project) return { ok: false as const, error: 'Project not found.' };

  const { session, company, payload } = await getAccess(project.workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canWrite) return { ok: false as const, error: 'Not allowed.' };
  if (payload.workspace.status !== 'ACTIVE') {
    return { ok: false as const, error: 'Workspace is archived. Restore it to edit projects.' };
  }

  const slugger = new GithubSlugger();
  const newSlug = slugger.slug(name.trim());
  await prisma.project.update({
    where: { id: project.id },
    data: { name: name.trim(), slug: newSlug }
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'SETTINGS_UPDATE',
      resourceType: 'Project',
      resourceId: project.id,
      details: { event: 'PROJECT_UPDATED', from: { name: project.name }, to: { name: name.trim() } }
    }
  });

  revalidatePath(`/workspaces/${project.workspaceId}`);
  return { ok: true as const };
}

export async function deleteProjectAction(
  input: z.infer<typeof DeleteProjectSchema>
) {
  const parsed = DeleteProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid project.' };
  }
  const { projectId } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, workspaceId: true, name: true }
  });
  if (!project) return { ok: false as const, error: 'Project not found.' };

  const { session, company, payload } = await getAccess(project.workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canAdmin) return { ok: false as const, error: 'Only workspace admins can delete projects.' };
  if (payload.workspace.status !== 'ACTIVE') {
    return { ok: false as const, error: 'Workspace is archived. Restore it to archive projects.' };
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { deletedAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'SETTINGS_UPDATE',
      resourceType: 'Project',
      resourceId: project.id,
      details: { event: 'PROJECT_DELETED', name: project.name }
    }
  });

  revalidatePath(`/workspaces/${project.workspaceId}`);
  return { ok: true as const };
}

// --- Workspace API Keys ---

const KEY_PREFIX_DISPLAY_LEN = 8;
const KEY_SECRET_BYTES = 32;

function generateKeySecret(): { secret: string; prefix: string } {
  const secret = randomBytes(KEY_SECRET_BYTES).toString('base64url');
  const prefix = secret.slice(0, KEY_PREFIX_DISPLAY_LEN);
  return { secret, prefix };
}

export async function createKeyAction(input: z.infer<typeof CreateKeySchema>) {
  const parsed = CreateKeySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { workspaceId, name } = parsed.data;
  const { session, company, payload } = await getAccess(workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canWrite) return { ok: false as const, error: 'Not allowed.' };
  if (payload.workspace.status !== 'ACTIVE') {
    return { ok: false as const, error: 'Workspace is archived. Restore it to create keys.' };
  }

  const ws = await prisma.workspace.findFirst({
    where: { id: workspaceId, companyId: company.id, deletedAt: null },
    select: { id: true }
  });
  if (!ws) return { ok: false as const, error: 'Workspace not found.' };

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role,
  };

  if (payload.workspace.apiWorkspaceId) {
    if (!isApiKeySyncConfigured()) {
      return {
        ok: false as const,
        error:
          'HYRELOG_API_KEY_SECRET is not set in the dashboard environment. Provisioned workspaces must create synced API keys so the copied key includes the hlk_ prefix.'
      };
    }

    const result = await createKeyAndSync(workspaceId, name.trim(), actor);
    if (!result.ok) return { ok: false as const, error: result.error };
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        companyId: company.id,
        action: 'SETTINGS_UPDATE',
        resourceType: 'WorkspaceApiKey',
        resourceId: result.keyId,
        details: { apiKey: { action: 'create', id: result.keyId, name: name.trim(), prefix: result.prefix } }
      }
    });
    revalidatePath(`/workspaces/${workspaceId}`);
    return {
      ok: true as const,
      id: result.keyId,
      name: name.trim(),
      prefix: result.prefix,
      secret: result.fullKey
    };
  }

  const { secret, prefix } = generateKeySecret();
  const hash = await hashPassword(secret);

  let key: { id: string; name: string; prefix: string };
  try {
    key = await prisma.workspaceApiKey.create({
      data: {
        workspaceId,
        name: name.trim(),
        prefix,
        hash
      },
      select: { id: true, name: true, prefix: true }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { ok: false as const, error: 'A key with this name already exists in this workspace.' };
    }
    throw err;
  }

  if (payload.workspace.apiWorkspaceId && isHyreLogApiConfigured() && key.prefix.startsWith('hlk_')) {
    await syncKeyAfterCreate(key.id, actor).catch(() => {});
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'SETTINGS_UPDATE',
      resourceType: 'WorkspaceApiKey',
      resourceId: key.id,
      details: { apiKey: { action: 'create', id: key.id, name: key.name, prefix: key.prefix } }
    }
  });

  revalidatePath(`/workspaces/${workspaceId}`);
  return {
    ok: true as const,
    id: key.id,
    name: key.name,
    prefix: key.prefix,
    secret
  };
}

export async function renameKeyAction(input: z.infer<typeof RenameKeySchema>) {
  const parsed = RenameKeySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }
  const { keyId, name } = parsed.data;

  const key = await prisma.workspaceApiKey.findFirst({
    where: { id: keyId },
    select: { id: true, workspaceId: true, name: true }
  });
  if (!key) return { ok: false as const, error: 'Key not found.' };

  const { session, company, payload } = await getAccess(key.workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canWrite) return { ok: false as const, error: 'Not allowed.' };
  if (payload.workspace.status !== 'ACTIVE') {
    return { ok: false as const, error: 'Workspace is archived. Restore it to rename keys.' };
  }

  await prisma.workspaceApiKey.update({
    where: { id: key.id },
    data: { name: name.trim() }
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'SETTINGS_UPDATE',
      resourceType: 'WorkspaceApiKey',
      resourceId: key.id,
      details: { apiKey: { action: 'rename', from: key.name, to: name.trim() } }
    }
  });

  revalidatePath(`/workspaces/${key.workspaceId}`);
  return { ok: true as const };
}

export async function revokeKeyAction(input: z.infer<typeof RevokeKeySchema>) {
  const parsed = RevokeKeySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: 'Invalid key.' };
  }
  const { keyId } = parsed.data;

  const key = await prisma.workspaceApiKey.findFirst({
    where: { id: keyId },
    select: { id: true, workspaceId: true, name: true, revokedAt: true }
  });
  if (!key) return { ok: false as const, error: 'Key not found.' };
  if (key.revokedAt) return { ok: false as const, error: 'Key is already revoked.' };

  const { session, company, payload } = await getAccess(key.workspaceId);
  if (!payload) return { ok: false as const, error: 'Not authorized.' };
  if (!payload.canWrite) return { ok: false as const, error: 'Not allowed.' };

  const actor = {
    userId: session.user.id,
    userEmail: (session.user as { email?: string | null }).email ?? null,
    userRole: (session.userCompany as { role: string }).role,
  };
  const result = await revokeKeyAndSync(keyId, actor);
  if (!result.ok) return { ok: false as const, error: result.error };

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      companyId: company.id,
      action: 'SETTINGS_UPDATE',
      resourceType: 'WorkspaceApiKey',
      resourceId: key.id,
      details: { apiKey: { action: 'revoke', name: key.name } }
    }
  });

  revalidatePath(`/workspaces/${key.workspaceId}`);
  return { ok: true as const };
}
