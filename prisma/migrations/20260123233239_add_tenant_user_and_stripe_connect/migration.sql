-- CreateEnum
CREATE TYPE "TenantUserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StripeAccountStatus" AS ENUM ('PENDING', 'CONNECTED', 'ACTIVE', 'RESTRICTED');

-- CreateTable
CREATE TABLE "TenantUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "discordId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "discordAvatar" TEXT,
    "email" TEXT,
    "stripeCustomerId" TEXT,
    "status" "TenantUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "onboardingData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantUserId" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantStripeConfig" (
    "tenantId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "stripeAccountStatus" "StripeAccountStatus" NOT NULL DEFAULT 'PENDING',
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantStripeConfig_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE INDEX "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");

-- CreateIndex
CREATE INDEX "TenantUser_discordId_idx" ON "TenantUser"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantUser_tenantId_discordId_key" ON "TenantUser"("tenantId", "discordId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscription_tenantUserId_key" ON "TenantSubscription"("tenantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscription_stripeSubscriptionId_key" ON "TenantSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "TenantSubscription_stripeSubscriptionId_idx" ON "TenantSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "TenantSubscription_productSlug_idx" ON "TenantSubscription"("productSlug");

-- CreateIndex
CREATE UNIQUE INDEX "TenantStripeConfig_stripeAccountId_key" ON "TenantStripeConfig"("stripeAccountId");

-- CreateIndex
CREATE INDEX "TenantStripeConfig_stripeAccountId_idx" ON "TenantStripeConfig"("stripeAccountId");

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantStripeConfig" ADD CONSTRAINT "TenantStripeConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
