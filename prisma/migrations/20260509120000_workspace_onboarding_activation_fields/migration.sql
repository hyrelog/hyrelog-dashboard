-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "onboardingSetupCompletedAt" TIMESTAMP(3),
ADD COLUMN "firstAuditEventReceivedAt" TIMESTAMP(3),
ADD COLUMN "onboardingActivationCompletedAt" TIMESTAMP(3),
ADD COLUMN "onboardingSkippedAt" TIMESTAMP(3),
ADD COLUMN "onboardingSkipReason" TEXT,
ADD COLUMN "onboardingUseCase" TEXT;

-- Backfill: workspaces already marked COMPLETE had finished the old combined flow; treat as setup + activation done for migration purposes.
UPDATE "workspaces"
SET
  "onboardingSetupCompletedAt" = COALESCE("onboardingCompletedAt", "updatedAt"),
  "onboardingActivationCompletedAt" = COALESCE("onboardingCompletedAt", "updatedAt")
WHERE "onboardingStatus" = 'COMPLETE'
  AND "onboardingSetupCompletedAt" IS NULL;
