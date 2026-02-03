-- Add panel configuration fields to DiscordBotSetup
ALTER TABLE "DiscordBotSetup" ADD COLUMN "panelTitle" TEXT NOT NULL DEFAULT 'Support Tickets';
ALTER TABLE "DiscordBotSetup" ADD COLUMN "panelDescription" TEXT NOT NULL DEFAULT 'Select a category and severity, then click **Create Ticket**.';
ALTER TABLE "DiscordBotSetup" ADD COLUMN "panelButtonLabel" TEXT NOT NULL DEFAULT 'Create Ticket';
ALTER TABLE "DiscordBotSetup" ADD COLUMN "panelInfoLines" TEXT;
