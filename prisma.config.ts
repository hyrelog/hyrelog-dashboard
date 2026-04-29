// Do not `import "dotenv/config"` here: the production Docker image is Next standalone and does not
// ship `node_modules` next to prisma.config.ts, so ECS migration tasks fail with “Cannot find module dotenv/config”.
// Prisma CLI still loads `.env` from the project root when you run migrate locally.
// On ECS, `DATABASE_URL` is injected by the task definition Secrets Manager mapping.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
