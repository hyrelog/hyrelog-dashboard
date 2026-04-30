'use server';

import { prisma } from '@/lib/prisma';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { PlatformRoleType, UserStatus } from '@/generated/prisma/client';
import { sendApprovalEmail } from '@/lib/email/sendApprovalEmail';

async function requirePlatformAdmin() {
  const session = await requireDashboardAccess('/admin/users');
  const role = await prisma.platformRole.findUnique({
    where: { userId: session.user.id },
    select: { role: true }
  });

  if (role?.role !== PlatformRoleType.HYRELOG_ADMIN) return null;
  return session;
}

export async function listUsersForPlatformAdmin() {
  const session = await requirePlatformAdmin();
  if (!session) return { ok: false as const, error: 'Forbidden' };

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      platformRole: {
        select: { role: true }
      }
    }
  });

  return { ok: true as const, users };
}

export async function approveUser(userId: string) {
  const session = await requirePlatformAdmin();
  if (!session) return { ok: false as const, error: 'Forbidden' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, status: true }
  });
  if (!user) return { ok: false as const, error: 'User not found' };

  if (user.status === UserStatus.ACTIVE) {
    return { ok: true as const };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE }
  });

  try {
    await sendApprovalEmail({ to: user.email, firstName: user.firstName });
  } catch (error) {
    console.error('[approveUser] failed to send approval email', error);
  }

  return { ok: true as const };
}

export async function grantPlatformAdmin(userId: string) {
  const session = await requirePlatformAdmin();
  if (!session) return { ok: false as const, error: 'Forbidden' };

  await prisma.platformRole.upsert({
    where: { userId },
    update: { role: PlatformRoleType.HYRELOG_ADMIN },
    create: { userId, role: PlatformRoleType.HYRELOG_ADMIN }
  });

  return { ok: true as const };
}

export async function revokePlatformAdmin(userId: string) {
  const session = await requirePlatformAdmin();
  if (!session) return { ok: false as const, error: 'Forbidden' };
  if (session.user.id === userId) return { ok: false as const, error: 'Cannot revoke yourself' };

  await prisma.platformRole.deleteMany({
    where: { userId, role: PlatformRoleType.HYRELOG_ADMIN }
  });

  return { ok: true as const };
}
