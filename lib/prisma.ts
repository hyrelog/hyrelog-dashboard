import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import type { PoolConfig } from 'pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Add it to .env (e.g. DATABASE_URL="postgresql://user:pass@localhost:5432/dbname") and ensure PostgreSQL is running.'
  );
}

function poolConfig(cs: string): PoolConfig {
  const isAwsRds = /\.rds\.amazonaws\.com/i.test(cs);
  const preferInsecureTls =
    process.env.RDS_PG_SSL_REJECT_UNAUTHORIZED === 'false' ||
    process.env.PGSSLMODE === 'no-verify';

  if (!isAwsRds) {
    return { connectionString: cs };
  }

  // RDS + Node `pg`: without the AWS RDS CA bundle, TLS can fail ("self-signed certificate in certificate
  // chain"). Install `/etc/ssl/certs/aws-rds-global-bundle.pem` and NODE_EXTRA_CA_CERTS in Dockerfile, or set
  // RDS_PG_SSL_REJECT_UNAUTHORIZED=false only with eyes open (traffic still encrypted, weaker server identity checks).
  return {
    connectionString: cs,
    ssl: preferInsecureTls ? { rejectUnauthorized: false } : { rejectUnauthorized: true },
  };
}

const pool = new Pool(poolConfig(connectionString));
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
