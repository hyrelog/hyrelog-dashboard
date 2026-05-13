/**
 * Loaded only by the Prisma CLI (migrate, generate, studio), not by the Next.js server bundle.
 * Next injects env at runtime; the CLI does not — load `.env` / `.env.local` so `migrate dev` works locally.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

import { defineConfig } from "prisma/config";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
