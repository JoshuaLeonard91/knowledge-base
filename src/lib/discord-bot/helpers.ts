/**
 * Discord Bot Shared Helpers
 *
 * Utilities used across setup, panel, notifications, and reply modules.
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
import { prisma } from '@/lib/db/client';
import { botManager } from './manager';
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import type { TicketComment } from '@/lib/ticketing/types';
import { MAIN_DOMAIN_BOT_ID } from './constants';

// ==========================================
// TENANT RESOLUTION
// ==========================================

export async function resolveTenantSlug(botId: string): Promise<string> {
  if (botId === MAIN_DOMAIN_BOT_ID) {
    return process.env.MAIN_DOMAIN_SLUG || 'main';
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: botId },
    select: { slug: true },
  });
  return tenant?.slug || botId;
}

export async function resolveTenantName(botId: string): Promise<string> {
  if (botId === MAIN_DOMAIN_BOT_ID) {
    return process.env.MAIN_DOMAIN_NAME || 'Support';
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: botId },
    select: { name: true },
  });
  return tenant?.name || 'Support';
}

// ==========================================
// BOT SETUP CONFIG
// ==========================================

export async function getBotSetup(botId: string) {
  return prisma.discordBotSetup.findUnique({ where: { id: botId } });
}

// ==========================================
// CONVERSATION FORMATTING
// ==========================================

/**
 * Format ticket comments into a markdown conversation string.
 * Truncates to maxLength, keeping the most recent messages.
 */
export function formatConversationHistory(
  comments: TicketComment[],
  maxLength = 3500
): string {
  if (comments.length === 0) return '*No messages yet.*';

  const formatted = comments.map((c) => {
    const author = c.isStaff ? '**Support Team**' : '**You**';
    const timestamp = Math.floor(new Date(c.created).getTime() / 1000);
    const body = c.body.replace(/\n/g, '\n> ');
    return `${author} \u00b7 <t:${timestamp}:R>\n> ${body}`;
  });

  let result = formatted.join('\n\n');

  // If too long, drop older messages and prepend notice
  if (result.length > maxLength) {
    const lines = formatted.reverse(); // most recent first
    const kept: string[] = [];
    let len = 0;
    for (const line of lines) {
      if (len + line.length + 2 > maxLength - 40) break;
      kept.unshift(line);
      len += line.length + 2;
    }
    result = '*... earlier messages omitted*\n\n' + kept.join('\n\n');
  }

  return result;
}

// ==========================================
// DM CONTAINER BUILDER
// ==========================================

const BLURPLE = 0x5865f2;
const severityAccentColors: Record<string, number> = {
  low: 0x57f287,
  medium: 0xfee75c,
  high: 0xe67e22,
  critical: 0xed4245,
};

export function buildTicketDMContainer(params: {
  ticketId: string;
  summary: string;
  status: string;
  priority?: string;
  severity?: string;
  conversationMarkdown: string;
  botId: string;
  portalUrl: string;
}): ContainerBuilder {
  const accentColor = params.severity
    ? (severityAccentColors[params.severity] || BLURPLE)
    : BLURPLE;

  const statusLine = [
    `**Status:** ${params.status}`,
    params.priority ? `**Priority:** ${params.priority}` : null,
  ].filter(Boolean).join('  \u00b7  ');

  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${params.ticketId}`)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(statusLine)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(params.conversationMarkdown)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Last updated <t:${Math.floor(Date.now() / 1000)}:R>`
      )
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
          .setURL(params.portalUrl)
      )
    );

  return container;
}

// ==========================================
// REFRESH TICKET DM (Edit in-place)
// ==========================================

/**
 * Refresh (edit) the tracked DM for a ticket with the latest conversation.
 * If the message was deleted, sends a new DM and updates the tracker.
 */
export async function refreshTicketDM(
  botId: string,
  ticketId: string,
  discordUserId: string
): Promise<void> {
  try {
    const tracker = await prisma.ticketDMTracker.findUnique({
      where: {
        tenantId_ticketId_discordUserId: {
          tenantId: botId,
          ticketId,
          discordUserId,
        },
      },
    });

    if (!tracker) return;

    const client = botManager.getBot(botId);
    if (!client) return;

    // Get ticket with comments
    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? getTicketProvider()
      : await getTicketProviderForTenant(botId);
    if (!provider) return;

    const ticket = await provider.getTicket(ticketId, discordUserId);
    if (!ticket) return;

    const slug = await resolveTenantSlug(botId);
    const portalUrl = `https://${slug}.helpportal.app/support/tickets/${ticketId}`;
    const conversationMarkdown = formatConversationHistory(ticket.comments);

    const container = buildTicketDMContainer({
      ticketId,
      summary: ticket.summary,
      status: ticket.status,
      priority: ticket.priority,
      conversationMarkdown,
      botId,
      portalUrl,
    });

    try {
      // Try editing the existing DM
      const user = await client.users.fetch(discordUserId);
      const dmChannel = await user.createDM();
      const message = await dmChannel.messages.fetch(tracker.dmMessageId);
      await message.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {
      // Message was deleted or inaccessible — send a new one
      try {
        const user = await client.users.fetch(discordUserId);
        const sent = await user.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });

        await prisma.ticketDMTracker.update({
          where: { id: tracker.id },
          data: {
            dmMessageId: sent.id,
            dmChannelId: sent.channelId,
          },
        });
      } catch (sendErr) {
        console.error('[Helpers] Failed to send replacement DM:', sendErr);
      }
    }
  } catch (error) {
    console.error('[Helpers] refreshTicketDM error:', error);
  }
}
