/**
 * Discord Bot DM Notifications
 *
 * Two notification types:
 * 1. sendTicketCreationDM — DMs user after ticket creation with V2 container
 * 2. sendTicketUpdateDM — Edits existing DM to append new replies (or sends new DM)
 *
 * Both respect DiscordBotSetup preferences (dmOnCreate, dmOnUpdate).
 * DM message IDs are tracked in TicketDMTracker for edit-in-place behavior.
 */

import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { botManager } from './manager';
import { prisma } from '@/lib/db/client';
import {
  getBotSetup,
  refreshTicketDM,
  resolveTenantSlug,
} from './helpers';
import { MAIN_DOMAIN_BOT_ID } from './constants';

// ==========================================
// TYPES
// ==========================================

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

interface TicketCreationDMParams {
  botId: string;
  tenantSlug: string;
  ticketId: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  discordUserId: string;
}

// ==========================================
// ACCENT COLORS
// ==========================================

const BLURPLE = 0x5865f2;
const severityAccentColors: Record<string, number> = {
  low: 0x57f287,
  medium: 0xfee75c,
  high: 0xe67e22,
  critical: 0xed4245,
};

const statusEmojis: Record<string, string> = {
  open: '\u{1F7E2}',           // 🟢
  'in progress': '\u{1F7E1}',  // 🟡
  resolved: '\u2705',          // ✅
  closed: '\u2705',            // ✅
};

// ==========================================
// CREATION DM
// ==========================================

/**
 * Send a DM to the user after ticket creation with a V2 container.
 * Creates a TicketDMTracker record for future edit-in-place updates.
 */
export async function sendTicketCreationDM(
  params: TicketCreationDMParams
): Promise<boolean> {
  try {
    // Check setup preferences
    const setup = await getBotSetup(params.botId);
    if (setup && !setup.dmOnCreate) return false;

    const client = botManager.getBot(params.botId);
    if (!client) {
      console.warn(`[Notifications] No bot available for ${params.botId}`);
      return false;
    }

    const user = await client.users.fetch(params.discordUserId);
    if (!user) return false;

    const portalUrl = `https://${params.tenantSlug}.helpportal.app/support/tickets/${params.ticketId}`;
    const accentColor = severityAccentColors[params.severity] || BLURPLE;
    const severityLabel = params.severity.charAt(0).toUpperCase() + params.severity.slice(1);
    const truncatedDesc = params.description.length > 1500
      ? params.description.substring(0, 1497) + '...'
      : params.description;

    const statusEmoji = statusEmojis[params.status.toLowerCase()] || '\u26AA';

    const container = new ContainerBuilder()
      .setAccentColor(accentColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${params.ticketId}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Status:** ${statusEmoji} ${params.status}\n` +
          `**Category:** ${params.category}  \u00b7  **Severity:** ${severityLabel}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${params.title}\n${truncatedDesc}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Reply using the button below.')
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`reply:${params.botId}:${params.ticketId}`)
            .setLabel('Reply')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel('View on Portal')
            .setStyle(ButtonStyle.Link)
            .setURL(portalUrl)
        )
      );

    const sent = await user.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    // Track the DM for future edits
    await prisma.ticketDMTracker.upsert({
      where: {
        tenantId_ticketId_discordUserId: {
          tenantId: params.botId,
          ticketId: params.ticketId,
          discordUserId: params.discordUserId,
        },
      },
      create: {
        tenantId: params.botId,
        ticketId: params.ticketId,
        discordUserId: params.discordUserId,
        dmMessageId: sent.id,
        dmChannelId: sent.channelId,
      },
      update: {
        dmMessageId: sent.id,
        dmChannelId: sent.channelId,
      },
    });

    return true;
  } catch (error) {
    console.error('[Notifications] Failed to send creation DM:', error);
    return false;
  }
}

// ==========================================
// UPDATE DM (Edit-in-place)
// ==========================================

/**
 * Send or edit a DM about a ticket update (new comment from support).
 * If a TicketDMTracker exists, edits the existing message.
 * Otherwise sends a new DM and creates a tracker.
 */
export async function sendTicketUpdateDM(
  notification: TicketNotification
): Promise<boolean> {
  try {
    // Check setup preferences
    const setup = await getBotSetup(notification.tenantId);
    if (setup && !setup.dmOnUpdate) return false;

    // Check if we have an existing DM to edit — if so, always update it
    // (the tracker proves we already sent this user a DM for this ticket)
    const tracker = await prisma.ticketDMTracker.findUnique({
      where: {
        tenantId_ticketId_discordUserId: {
          tenantId: notification.tenantId,
          ticketId: notification.ticketId,
          discordUserId: notification.discordUserId,
        },
      },
    });

    if (tracker) {
      // Edit the existing DM with full conversation
      await refreshTicketDM(
        notification.tenantId,
        notification.ticketId,
        notification.discordUserId
      );
      return true;
    }

    // No tracker — only send a new DM if user has opted in to notifications
    const isMainDomain = notification.tenantId === MAIN_DOMAIN_BOT_ID;
    const tenantUser = await prisma.tenantUser.findFirst({
      where: {
        ...(isMainDomain ? { tenantId: null } : { tenant: { id: notification.tenantId } }),
        discordId: notification.discordUserId,
        discordNotifications: true,
      },
    });

    if (!tenantUser) return false;

    // Send a new DM with just this update
    const client = botManager.getBot(notification.tenantId);
    if (!client) {
      console.warn(`[Notifications] No bot available for ${notification.tenantId}`);
      return false;
    }

    const user = await client.users.fetch(notification.discordUserId);
    if (!user) return false;

    const slug = await resolveTenantSlug(notification.tenantId);
    const portalUrl = `https://${slug}.helpportal.app/support/tickets/${notification.ticketId}`;

    const container = new ContainerBuilder()
      .setAccentColor(BLURPLE)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${notification.ticketId}`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Status:** ${notification.status}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${notification.commentAuthor}**\n> ${truncate(notification.commentBody, 1500)}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# Reply using the button below.')
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`reply:${notification.tenantId}:${notification.ticketId}`)
            .setLabel('Reply')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel('View on Portal')
            .setStyle(ButtonStyle.Link)
            .setURL(portalUrl)
        )
      );

    const sent = await user.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    // Create tracker for future edits
    await prisma.ticketDMTracker.create({
      data: {
        tenantId: notification.tenantId,
        ticketId: notification.ticketId,
        discordUserId: notification.discordUserId,
        dmMessageId: sent.id,
        dmChannelId: sent.channelId,
      },
    });

    return true;
  } catch (error) {
    console.error('[Notifications] Failed to send update DM:', error);
    return false;
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
