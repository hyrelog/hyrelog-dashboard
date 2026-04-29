/*
  Warnings:

  - You are about to drop the column `companyRefId` on the `api_provisioning` table. All the data in the column will be lost.
  - You are about to drop the column `companyRefId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `acceptedByEmail` on the `invites` table. All the data in the column will be lost.
  - You are about to drop the column `acceptedIp` on the `invites` table. All the data in the column will be lost.
  - You are about to drop the column `companyRefId` on the `invites` table. All the data in the column will be lost.
  - You are about to drop the column `workspaceRefId` on the `invites` table. All the data in the column will be lost.
  - You are about to drop the column `companyRefId` on the `stripe_events` table. All the data in the column will be lost.
  - You are about to drop the column `companyRefId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the `company_access` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `company_refs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emailChangeRecords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `phoneChangeRecords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workspace_access` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workspace_refs` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[companyId]` on the table `api_provisioning` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyId` to the `api_provisioning` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `invites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "api_provisioning" DROP CONSTRAINT "api_provisioning_companyRefId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_companyRefId_fkey";

-- DropForeignKey
ALTER TABLE "company_access" DROP CONSTRAINT "company_access_companyRefId_fkey";

-- DropForeignKey
ALTER TABLE "company_access" DROP CONSTRAINT "company_access_userId_fkey";

-- DropForeignKey
ALTER TABLE "company_refs" DROP CONSTRAINT "company_refs_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "countries" DROP CONSTRAINT "countries_continentId_fkey";

-- DropForeignKey
ALTER TABLE "countries" DROP CONSTRAINT "countries_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "emailChangeRecords" DROP CONSTRAINT "emailChangeRecords_userId_fkey";

-- DropForeignKey
ALTER TABLE "invites" DROP CONSTRAINT "invites_companyRefId_fkey";

-- DropForeignKey
ALTER TABLE "invites" DROP CONSTRAINT "invites_workspaceRefId_fkey";

-- DropForeignKey
ALTER TABLE "phoneChangeRecords" DROP CONSTRAINT "phoneChangeRecords_userId_fkey";

-- DropForeignKey
ALTER TABLE "regions" DROP CONSTRAINT "regions_countryId_fkey";

-- DropForeignKey
ALTER TABLE "stripe_events" DROP CONSTRAINT "stripe_events_companyRefId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_companyRefId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_access" DROP CONSTRAINT "workspace_access_userId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_access" DROP CONSTRAINT "workspace_access_workspaceRefId_fkey";

-- DropForeignKey
ALTER TABLE "workspace_refs" DROP CONSTRAINT "workspace_refs_companyRefId_fkey";

-- DropIndex
DROP INDEX "api_provisioning_companyRefId_key";

-- DropIndex
DROP INDEX "audit_logs_companyRefId_idx";

-- DropIndex
DROP INDEX "invites_companyRefId_idx";

-- DropIndex
DROP INDEX "invites_companyRefId_status_idx";

-- DropIndex
DROP INDEX "invites_workspaceRefId_idx";

-- DropIndex
DROP INDEX "invites_workspaceRefId_status_idx";

-- DropIndex
DROP INDEX "stripe_events_companyRefId_idx";

-- DropIndex
DROP INDEX "subscriptions_companyRefId_key";

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "api_provisioning" DROP COLUMN "companyRefId",
ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "companyRefId",
ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "invites" DROP COLUMN "acceptedByEmail",
DROP COLUMN "acceptedIp",
DROP COLUMN "companyRefId",
DROP COLUMN "workspaceRefId",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "stripe_events" DROP COLUMN "companyRefId",
ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "companyRefId",
ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "verifications" ADD COLUMN     "userId" TEXT;

-- usage_periods (20260126000000) FKs company_refs; drop before company_refs is removed
DO $$
BEGIN
  IF to_regclass('public.usage_periods') IS NOT NULL THEN
    ALTER TABLE "usage_periods" DROP CONSTRAINT IF EXISTS "usage_periods_companyId_fkey";
  END IF;
END $$;

-- DropTable
DROP TABLE "company_access";

-- DropTable
DROP TABLE "company_refs";

-- DropTable
DROP TABLE "emailChangeRecords";

-- DropTable
DROP TABLE "phoneChangeRecords";

-- DropTable
DROP TABLE "workspace_access";

-- DropTable
DROP TABLE "workspace_refs";

-- CreateTable
CREATE TABLE "email_change_records" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "new_email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "email_change_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_change_records" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "newPhoneNumber" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "phone_change_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferredRegion" "DataRegion" NOT NULL DEFAULT 'APAC',
    "apiCompanyId" TEXT,
    "createdByUserId" TEXT,
    "createdVia" TEXT NOT NULL DEFAULT 'SELF_SERVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferredRegion" "DataRegion",
    "apiWorkspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'READER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_change_records_userId_idx" ON "email_change_records"("userId");

-- CreateIndex
CREATE INDEX "email_change_records_expires_at_idx" ON "email_change_records"("expires_at");

-- CreateIndex
CREATE INDEX "phone_change_records_userId_idx" ON "phone_change_records"("userId");

-- CreateIndex
CREATE INDEX "phone_change_records_otp_idx" ON "phone_change_records"("otp");

-- CreateIndex
CREATE INDEX "phone_change_records_expires_at_idx" ON "phone_change_records"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "companies_apiCompanyId_key" ON "companies"("apiCompanyId");

-- CreateIndex
CREATE INDEX "companies_apiCompanyId_idx" ON "companies"("apiCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_apiWorkspaceId_key" ON "workspaces"("apiWorkspaceId");

-- CreateIndex
CREATE INDEX "workspaces_companyId_idx" ON "workspaces"("companyId");

-- CreateIndex
CREATE INDEX "workspaces_apiWorkspaceId_idx" ON "workspaces"("apiWorkspaceId");

-- CreateIndex
CREATE INDEX "company_members_companyId_idx" ON "company_members"("companyId");

-- CreateIndex
CREATE INDEX "company_members_userId_idx" ON "company_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "company_members_userId_companyId_key" ON "company_members"("userId", "companyId");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_userId_workspaceId_key" ON "workspace_members"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "api_provisioning_companyId_key" ON "api_provisioning"("companyId");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "invites_companyId_status_idx" ON "invites"("companyId", "status");

-- CreateIndex
CREATE INDEX "invites_workspaceId_status_idx" ON "invites"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "stripe_events_companyId_idx" ON "stripe_events"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_companyId_key" ON "subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE INDEX "verifications_expiresAt_idx" ON "verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "verifications_userId_idx" ON "verifications"("userId");

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_change_records" ADD CONSTRAINT "email_change_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_change_records" ADD CONSTRAINT "phone_change_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "countries" ADD CONSTRAINT "countries_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "countries" ADD CONSTRAINT "countries_continentId_fkey" FOREIGN KEY ("continentId") REFERENCES "continents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_events" ADD CONSTRAINT "stripe_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_provisioning" ADD CONSTRAINT "api_provisioning_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- usage_periods: reattach to companies (ids match company_refs PKs that were migrated separately; empty DB is fine)
DO $$
BEGIN
  IF to_regclass('public.usage_periods') IS NOT NULL THEN
    ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
