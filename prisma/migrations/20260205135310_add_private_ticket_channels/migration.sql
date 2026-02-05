-- AlterTable
ALTER TABLE "DiscordBotSetup" ADD COLUMN     "supportCategoryId" TEXT;

-- AlterTable
ALTER TABLE "StaffMapping" ALTER COLUMN "jiraAccountId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TicketChannel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "assignedModId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketChannel_ticketId_idx" ON "TicketChannel"("ticketId");

-- CreateIndex
CREATE INDEX "TicketChannel_channelId_idx" ON "TicketChannel"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketChannel_tenantId_ticketId_key" ON "TicketChannel"("tenantId", "ticketId");
