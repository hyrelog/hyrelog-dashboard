-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "usage_periods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "eventsIngested" INTEGER NOT NULL DEFAULT 0,
    "exportsCreated" INTEGER NOT NULL DEFAULT 0,
    "webhooksActive" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "usage_periods_companyId_periodStart_key" ON "usage_periods"("companyId", "periodStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "usage_periods_companyId_idx" ON "usage_periods"("companyId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usage_periods_companyId_fkey'
    ) THEN
        ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
