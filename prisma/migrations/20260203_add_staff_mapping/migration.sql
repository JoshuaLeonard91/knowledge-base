-- Add StaffMapping table for Discord ↔ Jira account mapping
CREATE TABLE "StaffMapping" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "jiraAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMapping_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one mapping per Discord user per bot
CREATE UNIQUE INDEX "StaffMapping_botId_discordUserId_key" ON "StaffMapping"("botId", "discordUserId");

-- Index for lookups by bot
CREATE INDEX "StaffMapping_botId_idx" ON "StaffMapping"("botId");
