-- CreateTable
CREATE TABLE "TicketLogMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketLogMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketLogMessage_ticketId_idx" ON "TicketLogMessage"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketLogMessage_tenantId_ticketId_key" ON "TicketLogMessage"("tenantId", "ticketId");
