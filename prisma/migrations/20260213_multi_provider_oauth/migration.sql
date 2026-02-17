-- Multi-Provider OAuth Migration
-- Adds OAuthIdentity model, makes User/TenantUser provider-agnostic
-- Migrates existing Discord data to new generic fields

-- ==========================================
-- 1. Create OAuthIdentity table
-- ==========================================

CREATE TABLE "OAuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthIdentity_userId_key" ON "OAuthIdentity"("userId");
CREATE UNIQUE INDEX "OAuthIdentity_provider_providerId_key" ON "OAuthIdentity"("provider", "providerId");
CREATE INDEX "OAuthIdentity_userId_idx" ON "OAuthIdentity"("userId");

ALTER TABLE "OAuthIdentity" ADD CONSTRAINT "OAuthIdentity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ==========================================
-- 2. Modify User table
-- ==========================================

-- Add new generic display fields (with defaults so existing rows survive)
ALTER TABLE "User" ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;

-- Populate from existing Discord fields
UPDATE "User" SET
    "displayName" = "discordUsername",
    "avatarUrl" = "discordAvatar";

-- Remove the default now that data is populated
ALTER TABLE "User" ALTER COLUMN "displayName" DROP DEFAULT;

-- Create OAuthIdentity records from existing Discord users
INSERT INTO "OAuthIdentity" ("id", "userId", "provider", "providerId", "email", "username", "avatar", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "id",
    'discord',
    "discordId",
    "email",
    "discordUsername",
    "discordAvatar",
    CURRENT_TIMESTAMP
FROM "User"
WHERE "discordId" IS NOT NULL;

-- Make discordId nullable (was required before)
ALTER TABLE "User" ALTER COLUMN "discordId" DROP NOT NULL;

-- Drop old Discord-specific columns
ALTER TABLE "User" DROP COLUMN "discordUsername";
ALTER TABLE "User" DROP COLUMN "discordAvatar";

-- ==========================================
-- 3. Modify TenantUser table
-- ==========================================

-- Add new generic fields
ALTER TABLE "TenantUser" ADD COLUMN "userId" TEXT;
ALTER TABLE "TenantUser" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'discord';
ALTER TABLE "TenantUser" ADD COLUMN "providerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TenantUser" ADD COLUMN "displayName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "TenantUser" ADD COLUMN "avatarUrl" TEXT;

-- Populate from existing Discord fields
UPDATE "TenantUser" SET
    "providerId" = "discordId",
    "displayName" = "discordUsername",
    "avatarUrl" = "discordAvatar";

-- Link TenantUser to User via userId where discordId matches
UPDATE "TenantUser" tu SET "userId" = u."id"
FROM "User" u
WHERE u."discordId" = tu."discordId";

-- Remove defaults now that data is populated
ALTER TABLE "TenantUser" ALTER COLUMN "providerId" DROP DEFAULT;
ALTER TABLE "TenantUser" ALTER COLUMN "displayName" DROP DEFAULT;

-- Drop old composite unique index and add new one
DROP INDEX "TenantUser_tenantId_discordId_key";
CREATE UNIQUE INDEX "TenantUser_tenantId_provider_providerId_key" ON "TenantUser"("tenantId", "provider", "providerId");

-- Make discordId nullable (was required before)
ALTER TABLE "TenantUser" ALTER COLUMN "discordId" DROP NOT NULL;

-- Drop old Discord-specific columns
ALTER TABLE "TenantUser" DROP COLUMN "discordUsername";
ALTER TABLE "TenantUser" DROP COLUMN "discordAvatar";

-- Add userId index
CREATE INDEX "TenantUser_userId_idx" ON "TenantUser"("userId");
