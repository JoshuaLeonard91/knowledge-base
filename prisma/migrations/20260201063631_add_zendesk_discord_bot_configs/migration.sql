-- CreateEnum
CREATE TYPE "TicketProviderType" AS ENUM ('JIRA', 'ZENDESK');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "ticketProvider" "TicketProviderType";

-- AlterTable
ALTER TABLE "TenantUser" ADD COLUMN     "discordNotifications" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TenantZendeskConfig" (
    "tenantId" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "subdomain" TEXT,
    "email" TEXT,
    "apiToken" TEXT,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantZendeskConfig_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "TenantDiscordBotConfig" (
    "tenantId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDiscordBotConfig_pkey" PRIMARY KEY ("tenantId")
);

-- AddForeignKey
ALTER TABLE "TenantZendeskConfig" ADD CONSTRAINT "TenantZendeskConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDiscordBotConfig" ADD CONSTRAINT "TenantDiscordBotConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
