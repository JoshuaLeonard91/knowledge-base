/*
  Warnings:

  - You are about to drop the `TenantStripeConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TenantStripeConfig" DROP CONSTRAINT "TenantStripeConfig_tenantId_fkey";

-- DropTable
DROP TABLE "TenantStripeConfig";

-- DropEnum
DROP TYPE "StripeAccountStatus";
