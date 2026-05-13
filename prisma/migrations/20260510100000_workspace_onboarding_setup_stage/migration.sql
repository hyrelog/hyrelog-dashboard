-- CreateEnum
CREATE TYPE "WorkspaceOnboardingSetupStage" AS ENUM ('USE_CASE', 'WORKSPACE', 'REGION', 'COMPLETE');

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "onboardingSetupStage" "WorkspaceOnboardingSetupStage" NOT NULL DEFAULT 'USE_CASE';

-- Backfill: finished setup → COMPLETE stage
UPDATE "workspaces"
SET "onboardingSetupStage" = 'COMPLETE'
WHERE "onboardingSetupCompletedAt" IS NOT NULL;
