-- CreateTable
CREATE TABLE "DiscordBotSetup" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "ticketChannelId" TEXT,
    "logChannelId" TEXT,
    "ticketPanelMessageId" TEXT,
    "dmOnCreate" BOOLEAN NOT NULL DEFAULT true,
    "dmOnUpdate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordBotSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketDMTracker" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "dmMessageId" TEXT NOT NULL,
    "dmChannelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketDMTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketDMTracker_discordUserId_idx" ON "TicketDMTracker"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketDMTracker_tenantId_ticketId_discordUserId_key" ON "TicketDMTracker"("tenantId", "ticketId", "discordUserId");
