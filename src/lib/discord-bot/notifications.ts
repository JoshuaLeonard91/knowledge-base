/**
 * Discord Bot DM Notifications
 *
 * Sends ticket update DM embeds to users who opted in.
 * Called by webhook handlers when agents reply in Jira/Zendesk.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { botManager } from './manager';
import { prisma } from '@/lib/db/client';

interface TicketNotification {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  ticketId: string;
  ticketSummary: string;
  status: string;
  commentBody: string;
  commentAuthor: string;
  discordUserId: string;
}

/**
 * Send a DM embed to a user about a ticket update
 */
export async function sendTicketUpdateDM(
  notification: TicketNotification
): Promise<boolean> {
  try {
    // Check if user has opted in to notifications
    const tenantUser = await prisma.tenantUser.findFirst({
      where: {
        tenant: { id: notification.tenantId },
        discordId: notification.discordUserId,
        discordNotifications: true,
      },
    });

    if (!tenantUser) {
      return false; // User hasn't opted in
    }

    // Get the bot client for this tenant
    const client = botManager.getBot(notification.tenantId);
    if (!client) {
      console.warn(
        `[Notifications] No bot available for tenant ${notification.tenantId}`
      );
      return false;
    }

    // Fetch the Discord user
    const user = await client.users.fetch(notification.discordUserId);
    if (!user) return false;

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle('Ticket Update')
      .setDescription(
        [
          `**${notification.ticketId}** · ${notification.tenantName}`,
          `Status: ${notification.status}`,
          '',
          `New reply from ${notification.commentAuthor}:`,
          `> ${truncate(notification.commentBody, 200)}`,
        ].join('\n')
      )
      .setColor(0x5865f2) // Discord blurple
      .setTimestamp();

    // Build action row with buttons
    const portalUrl = `https://${notification.tenantSlug}.helpportal.app/support/tickets/${notification.ticketId}`;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('View on Portal')
        .setStyle(ButtonStyle.Link)
        .setURL(portalUrl),
      new ButtonBuilder()
        .setCustomId(`reply:${notification.tenantId}:${notification.ticketId}`)
        .setLabel('Reply')
        .setStyle(ButtonStyle.Primary)
    );

    // Send DM
    await user.send({ embeds: [embed], components: [row] });

    return true;
  } catch (error) {
    console.error('[Notifications] Failed to send DM:', error);
    return false;
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
