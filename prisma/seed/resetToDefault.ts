/**
 * Reset dashboard database to default state for testing.
 * Deletes all users, companies, workspaces, subscriptions, and auth data,
 * then re-seeds only reference data (plans, add-ons, regions, countries, etc.).
 * No users or companies remain after this script.
 *
 * Usage: npx tsx prisma/seed/resetToDefault.ts
 * Or: npm run db:reset (if script is added to package.json)
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { seedContinents } from './seedContinents';
import { seedCurrencies } from './seedCurrencies';
import { seedCountries } from './seedCountries';
import { seedRegions } from './seedRegions';
import { HYRELOG_PLANS } from './seedPlans';
import { HYRELOG_ADDONS } from './seedAddons';

const connectionString = process.env.DATABASE_URL ?? '';
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function clearAllData() {
  console.log('Clearing all data (tenant and auth)...');

  await prisma.$transaction(async (tx) => {
    const skipIfMissing = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (err: unknown) {
        if ((err as { code?: string })?.code === 'P2021') console.log(`  Skipping ${name} (table not present).`);
        else throw err;
      }
    };
    await skipIfMissing('auditLog', () => tx.auditLog.deleteMany());
    await skipIfMissing('apiProvisioning', () => tx.apiProvisioning.deleteMany());
    await skipIfMissing('stripeEvent', () => tx.stripeEvent.deleteMany());
    await skipIfMissing('entitlementSnapshot', () => tx.entitlementSnapshot.deleteMany());
    await skipIfMissing('subscriptionAddOn', () => tx.subscriptionAddOn.deleteMany());
    await skipIfMissing('subscription', () => tx.subscription.deleteMany());
    await skipIfMissing('usagePeriod', () => tx.usagePeriod.deleteMany());
    await skipIfMissing('invite', () => tx.invite.deleteMany());
    await skipIfMissing('workspaceMember', () => tx.workspaceMember.deleteMany());
    await skipIfMissing('companyMember', () => tx.companyMember.deleteMany());
    await skipIfMissing('project', () => tx.project.deleteMany());
    await skipIfMissing('workspaceApiKey', () => tx.workspaceApiKey.deleteMany());
    await skipIfMissing('workspace', () => tx.workspace.deleteMany());
    await skipIfMissing('company', () => tx.company.deleteMany());

    await skipIfMissing('session', () => tx.session.deleteMany());
    await skipIfMissing('account', () => tx.account.deleteMany());
    await skipIfMissing('verification', () => tx.verification.deleteMany());
    await skipIfMissing('emailVerificationChallenge', () => tx.emailVerificationChallenge.deleteMany());
    await skipIfMissing('emailChangeRecord', () => tx.emailChangeRecord.deleteMany());
    await skipIfMissing('phoneChangeRecord', () => tx.phoneChangeRecord.deleteMany());
    await skipIfMissing('platformRole', () => tx.platformRole.deleteMany());
    await skipIfMissing('user', () => tx.user.deleteMany());

    await skipIfMissing('verificationToken', () => tx.verificationToken.deleteMany());

    await skipIfMissing('plan', () => tx.plan.deleteMany());
    await skipIfMissing('addOn', () => tx.addOn.deleteMany());
    await skipIfMissing('region', () => tx.region.deleteMany());
    await skipIfMissing('country', () => tx.country.deleteMany());
    await skipIfMissing('currency', () => tx.currency.deleteMany());
    await skipIfMissing('continent', () => tx.continent.deleteMany());
  });

  console.log('All data cleared.');
}

async function seedReferenceData() {
  console.log('Seeding reference data (plans, add-ons, regions, etc.)...');
  await seedContinents(prisma);
  await seedCurrencies(prisma);
  await seedCountries(prisma);
  await seedRegions(prisma);

  await prisma.plan.createMany({
    data: HYRELOG_PLANS.map((plan) => ({
      code: plan.code,
      name: plan.name,
      planType: plan.planType,
      status: plan.status,
      description: plan.description,
      baseEntitlements: plan.baseEntitlements,
    })),
    skipDuplicates: true,
  });
  console.log(`Seeded ${HYRELOG_PLANS.length} plans.`);

  await prisma.addOn.createMany({
    data: HYRELOG_ADDONS.map((addon) => ({
      code: addon.code,
      name: addon.name,
      description: addon.description,
      billingType: addon.billingType,
      isActive: addon.isActive,
      entitlementDelta: addon.entitlementDelta,
    })),
    skipDuplicates: true,
  });
  console.log(`Seeded ${HYRELOG_ADDONS.length} add-ons.`);
}

async function main() {
  await clearAllData();
  await seedReferenceData();
  console.log('Reset complete. Database has no users or companies; reference data only.');
}

main()
  .catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
