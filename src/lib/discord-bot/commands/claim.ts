/**
 * /claim Command — Ticket Claiming for Staff
 *
 * Allows a mod/staff member to claim a ticket from Discord.
 * - Always adds a Jira comment: "Claimed by {username} via Discord"
 * - If the user has a StaffMapping (Discord → Jira account), also assigns in Jira
 *
 * Custom ID: N/A (single slash command, no multi-step flow)
 */

import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { prisma } from '@/lib/db/client';
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import { MAIN_DOMAIN_BOT_ID } from '../constants';
import { logTicketClaimed } from '../log';

function isMainDomain(botId: string): boolean {
  return botId === MAIN_DOMAIN_BOT_ID;
}

async function resolveProvider(botId: string) {
  if (isMainDomain(botId)) {
    const provider = getTicketProvider();
    return provider.isAvailable() ? provider : null;
  }
  return getTicketProviderForTenant(botId);
}

export async function handleClaimCommand(
  interaction: ChatInputCommandInteraction,
  botId: string
): Promise<void> {
  const ticketId = interaction.options.getString('ticket', true).trim().toUpperCase();

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const provider = await resolveProvider(botId);
    if (!provider) {
      await interaction.editReply({
        content: 'Ticketing is not configured for this server.',
      });
      return;
    }

    // Add claim comment to Jira
    const commentText = `Claimed by ${interaction.user.username} via Discord`;
    const commented = await provider.addComment({
      ticketId,
      message: commentText,
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.username,
    });

    if (!commented) {
      await interaction.editReply({
        content: `Could not add comment to **${ticketId}**. Check that the ticket exists.`,
      });
      return;
    }

    // Check for staff mapping → assign in Jira
    let assignedInJira = false;
    const staffMapping = await prisma.staffMapping.findUnique({
      where: {
        botId_discordUserId: {
          botId,
          discordUserId: interaction.user.id,
        },
      },
    });

    if (staffMapping && provider.assignTicket) {
      assignedInJira = await provider.assignTicket(ticketId, staffMapping.jiraAccountId);
    }

    // Ephemeral confirmation
    let reply = `Ticket **${ticketId}** claimed.`;
    if (assignedInJira) {
      reply += ' Assigned to you in Jira.';
    } else if (!staffMapping) {
      reply += '\n-# No Jira account linked — ask your admin to add a staff mapping in the dashboard.';
    } else {
      reply += '\n-# Jira assignment failed — check your Jira account ID in the dashboard.';
    }

    await interaction.editReply({ content: reply });

    // Fire-and-forget: log to channel
    logTicketClaimed({
      botId,
      ticketId,
      claimedByUsername: interaction.user.username,
      claimedByUserId: interaction.user.id,
      assignedInJira,
    }).catch(err => console.error('[Claim] Log failed:', err));
  } catch (error) {
    console.error('[Claim] Error:', error);
    await interaction.editReply({
      content: 'An error occurred while claiming the ticket.',
    });
  }
}
