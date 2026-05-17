/**
 * Dashboard seed for screenshot / local demo — pairs with API seed-screenshot-demo.
 *
 * Prereq:
 *   1. Reference data: npm run db:seed  (or db:reset)
 *   2. API demo data:   cd ../hyrelog-api/services/api && npm run prisma:seed:screenshot
 *
 * Usage:
 *   npm run db:seed:screenshot
 */

import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  SubscriptionStatus,
  WorkspaceOnboardingStatus,
  WorkspaceOnboardingSetupStage,
} from '../../generated/prisma/client';
import { hashPassword } from '../../lib/argon2';
import {
  DEMO_API_COMPANY_ID,
  DEMO_DASHBOARD_COMPANY_ID,
  DEMO_LOGIN_EMAIL,
  DEMO_LOGIN_PASSWORD,
  DEMO_PROJECTS,
  DEMO_USERS,
  DEMO_WORKSPACES,
} from './demo-ids';

const connectionString = process.env.DATABASE_URL ?? '';
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function clearDemo() {
  const company = await prisma.company.findUnique({
    where: { id: DEMO_DASHBOARD_COMPANY_ID },
    select: { id: true },
  });
  if (!company) return;

  console.log('🧹 Removing previous Northwind demo from dashboard DB...');
  await prisma.auditLog.deleteMany({ where: { companyId: DEMO_DASHBOARD_COMPANY_ID } });
  await prisma.subscription.deleteMany({ where: { companyId: DEMO_DASHBOARD_COMPANY_ID } });
  await prisma.invite.deleteMany({ where: { companyId: DEMO_DASHBOARD_COMPANY_ID } });
  await prisma.workspaceMember.deleteMany({
    where: { workspace: { companyId: DEMO_DASHBOARD_COMPANY_ID } },
  });
  await prisma.companyMember.deleteMany({ where: { companyId: DEMO_DASHBOARD_COMPANY_ID } });
  await prisma.project.deleteMany({ where: { workspace: { companyId: DEMO_DASHBOARD_COMPANY_ID } } });
  await prisma.workspace.deleteMany({ where: { companyId: DEMO_DASHBOARD_COMPANY_ID } });
  await prisma.company.delete({ where: { id: DEMO_DASHBOARD_COMPANY_ID } });

  const userIds = Object.values(DEMO_USERS).map((u) => u.id);
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.companyMember.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  if (process.env.DEMO_SKIP_CLEAR !== '1') {
    await clearDemo();
  }

  const businessPlan = await prisma.plan.findFirst({
    where: { code: 'BUSINESS', status: 'ACTIVE' },
  });
  if (!businessPlan) {
    console.error('❌ BUSINESS plan not found. Run: npm run db:seed');
    process.exit(1);
  }

  const passwordHash = await hashPassword(DEMO_LOGIN_PASSWORD);

  for (const u of Object.values(DEMO_USERS)) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        name: `${u.firstName} ${u.lastName}`,
      },
      update: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    await prisma.account.upsert({
      where: { providerId_accountId: { providerId: 'credential', accountId: u.id } },
      create: {
        userId: u.id,
        accountId: u.id,
        providerId: 'credential',
        password: passwordHash,
      },
      update: { password: passwordHash },
    });
  }

  const admin = DEMO_USERS.admin;
  const company = await prisma.company.create({
    data: {
      id: DEMO_DASHBOARD_COMPANY_ID,
      slug: 'northwind-systems',
      name: 'Northwind Systems',
      preferredRegion: 'US',
      apiCompanyId: DEMO_API_COMPANY_ID,
      createdByUserId: admin.id,
      status: 'ACTIVE',
    },
  });

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const periodStart = new Date();

  await prisma.subscription.create({
    data: {
      companyId: company.id,
      planId: businessPlan.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    },
  });

  for (const u of Object.values(DEMO_USERS)) {
    await prisma.companyMember.create({
      data: {
        userId: u.id,
        companyId: company.id,
        role: u.role,
        createdByUserId: admin.id,
      },
    });
  }

  const inviteToken = randomBytes(32).toString('hex');
  await prisma.invite.create({
    data: {
      companyId: company.id,
      email: 'taylor.brooks@northwind.io',
      emailNormalized: 'taylor.brooks@northwind.io',
      companyRole: 'MEMBER',
      scope: 'COMPANY',
      status: 'PENDING',
      invitedByUserId: admin.id,
      tokenHash: createHash('sha256').update(inviteToken).digest('hex'),
      expiresAt: new Date(Date.now() + 14 * 86400000),
      pendingKey: 'taylor.brooks@northwind.io:COMPANY',
    },
  });

  const now = new Date();
  for (const ws of DEMO_WORKSPACES) {
    await prisma.workspace.create({
      data: {
        id: ws.dashboardId,
        companyId: company.id,
        name: ws.name,
        slug: ws.slug,
        preferredRegion: ws.preferredRegion,
        apiWorkspaceId: ws.apiId,
        status: 'ACTIVE',
        onboardingStatus: WorkspaceOnboardingStatus.COMPLETE,
        onboardingSetupStage: WorkspaceOnboardingSetupStage.COMPLETE,
        onboardingCompletedAt: now,
        onboardingSetupCompletedAt: now,
        onboardingActivationCompletedAt: now,
        firstAuditEventReceivedAt: now,
      },
    });
  }

  for (const p of DEMO_PROJECTS) {
    await prisma.project.create({
      data: {
        id: p.dashboardId,
        workspaceId: p.workspaceDashboardId,
        name: p.name,
        slug: p.slug,
        environment: p.environment,
        status: 'ACTIVE',
      },
    });
  }

  const prodId = DEMO_WORKSPACES[0]!.dashboardId;
  const stagingId = DEMO_WORKSPACES[1]!.dashboardId;
  const euId = DEMO_WORKSPACES[2]!.dashboardId;

  const workspaceMemberships: { userId: string; workspaceId: string; role: 'ADMIN' | 'WRITER' | 'READER' }[] = [
    { userId: admin.id, workspaceId: prodId, role: 'ADMIN' },
    { userId: admin.id, workspaceId: stagingId, role: 'ADMIN' },
    { userId: admin.id, workspaceId: euId, role: 'ADMIN' },
    { userId: DEMO_USERS.jordan.id, workspaceId: prodId, role: 'WRITER' },
    { userId: DEMO_USERS.jordan.id, workspaceId: stagingId, role: 'WRITER' },
    { userId: DEMO_USERS.sam.id, workspaceId: prodId, role: 'READER' },
    { userId: DEMO_USERS.sam.id, workspaceId: euId, role: 'READER' },
    { userId: DEMO_USERS.casey.id, workspaceId: stagingId, role: 'READER' },
  ];

  for (const m of workspaceMemberships) {
    await prisma.workspaceMember.create({
      data: {
        userId: m.userId,
        workspaceId: m.workspaceId,
        role: m.role,
        createdByUserId: admin.id,
      },
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📸 Northwind Systems demo ready (dashboard)');
  console.log(`   Company: ${company.name}`);
  console.log(`   Login:   ${DEMO_LOGIN_EMAIL}`);
  console.log(`   Password: ${DEMO_LOGIN_PASSWORD}`);
  console.log('   App:     http://localhost:4000');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
