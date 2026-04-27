import 'dotenv/config';
import GithubSlugger from 'github-slugger';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const COMPANY_ID = 'e88f0edd-99d7-45ce-b3dd-af1b915c9ebf';
const ONBOARDING_COMPLETED_BY_USER_ID = 'fb910a23-5478-4e6c-ba9d-77d3e3420ad5';

const ADJECTIVES = [
  'Alpha', 'Beta', 'Swift', 'Prime', 'Core', 'Apex', 'Nova', 'Vertex', 'Pulse',
  'Spark', 'Flux', 'Bold', 'Clear', 'Quick', 'Smart', 'Bright', 'Stable', 'Safe',
  'Cloud', 'Edge', 'Meta', 'Hyper', 'Ultra', 'Mega', 'Micro', 'Global', 'Local',
  'Red', 'Blue', 'Green', 'Silver', 'Golden', 'Dark', 'Light', 'Wild', 'Calm'
];

const NOUNS = [
  'Workspace', 'Hub', 'Lab', 'Studio', 'Zone', 'Base', 'Node', 'Unit', 'Cell',
  'Grid', 'Flow', 'Stack', 'Layer', 'Scope', 'Realm', 'Vault', 'Forge', 'Lens',
  'Pilot', 'Beacon', 'Portal', 'Bridge', 'Peak', 'Crest', 'Draft', 'Shift', 'Run',
  'Batch', 'Queue', 'Stream', 'Trace', 'Log', 'Audit', 'Report', 'View', 'Scope'
];

const DATA_REGIONS = ['US', 'EU', 'UK', 'AU'] as const;
const WORKSPACE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

function randomRegion(): (typeof DATA_REGIONS)[number] {
  return DATA_REGIONS[Math.floor(Math.random() * DATA_REGIONS.length)];
}

function randomStatus(): (typeof WORKSPACE_STATUSES)[number] {
  return WORKSPACE_STATUSES[Math.floor(Math.random() * WORKSPACE_STATUSES.length)];
}

function randomName(usedNames: Set<string>): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  let name = `${adj} ${noun}`;
  let suffix = 0;
  while (usedNames.has(name)) {
    suffix += 1;
    name = `${adj} ${noun} ${suffix}`;
  }
  usedNames.add(name);
  return name;
}

async function main() {
  const connectionString = process.env.DATABASE_URL ?? '';
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const usedNames = new Set<string>();
  const slugger = new GithubSlugger();

  const company = await prisma.company.findUnique({
    where: { id: COMPANY_ID },
    select: { id: true, name: true }
  });
  if (!company) {
    throw new Error(`Company ${COMPANY_ID} not found. Create the company first.`);
  }

  const count = 80;
  console.log(`Seeding ${count} workspaces for company "${company.name}" (${COMPANY_ID})...`);

  const today = new Date();

  for (let i = 0; i < count; i++) {
    const name = randomName(usedNames);
    const slug = slugger.slug(name);
    await prisma.workspace.create({
      data: {
        companyId: COMPANY_ID,
        name,
        slug,
        preferredRegion: randomRegion(),
        status: randomStatus(),
        onboardingStatus: 'COMPLETE',
        onboardingCompletedAt: today,
        onboardingCompletedBy: ONBOARDING_COMPLETED_BY_USER_ID
      }
    });
    if ((i + 1) % 20 === 0) console.log(`  Created ${i + 1}/${count}`);
  }

  console.log(`Done. Created ${count} workspaces.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
