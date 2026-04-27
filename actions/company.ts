'use server';

import { z } from 'zod';
import GithubSlugger from 'github-slugger';
import { prisma } from '@/lib/prisma';
import { requireDashboardAccess } from '@/lib/auth/requireDashboardAccess';
import { revalidatePath } from 'next/cache';

const UpdateCompanySchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  slug: z.string().trim().min(2, 'Slug is too short').max(60, 'Slug is too long').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
});

export async function updateCompanyAction(input: z.infer<typeof UpdateCompanySchema>) {
  const parsed = UpdateCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid fields.' };
  }

  const session = await requireDashboardAccess('/company-settings');
  const companyId = (session as { company: { id: string } }).company.id;
  const userRole = (session as { userCompany: { role: string } }).userCompany?.role;
  if (!['OWNER', 'ADMIN'].includes(userRole)) {
    return { ok: false as const, error: 'Only owners and admins can edit company settings.' };
  }

  const existing = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false as const, error: 'Company not found.' };

  const slugger = new GithubSlugger();
  const slug = slugger.slug(parsed.data.slug);

  const slugConflict = await prisma.company.findFirst({
    where: { slug, id: { not: companyId }, deletedAt: null },
    select: { id: true },
  });
  if (slugConflict) {
    return { ok: false as const, error: 'That slug is already in use by another company.' };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { name: parsed.data.name.trim(), slug },
  });

  revalidatePath('/company-settings');
  revalidatePath('/');
  return { ok: true as const };
}
