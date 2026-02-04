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
  Routes,
} from 'discord.js';
import { prisma } from '@/lib/db/client';
import { botManager } from './manager';
import type { ButtonInteraction } from 'discord.js';
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import type { TicketComment, TicketAttachment } from '@/lib/ticketing/types';
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
  portalUrl?: string,
  maxLength = 3500
): string {
  if (comments.length === 0) return '*No messages yet.*';

  const formatted = comments.map((c) => {
    const author = c.isStaff ? '**Support Team**' : '**You**';
    const body = c.body.replace(/\n/g, '\n> ');
    let text = `${author}\n> ${body}`;

    // Show attachment info for oversized files (small ones will be embedded as Discord files)
    if (c.attachments?.length) {
      const oversized = c.attachments.filter(a => a.size > 25 * 1024 * 1024);
      if (oversized.length > 0) {
        const links = oversized.map(a =>
          portalUrl
            ? `> \u{1F4CE} [${a.filename}](${portalUrl})`
            : `> \u{1F4CE} ${a.filename} (see portal)`
        );
        text += '\n' + links.join('\n');
      }
    }

    return text;
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

const statusEmojis: Record<string, string> = {
  open: '\u{1F7E2}',           // 🟢
  'in progress': '\u{1F7E1}',  // 🟡
  resolved: '\u2705',          // ✅
  closed: '\u2705',            // ✅
};

function getStatusEmoji(status: string): string {
  return statusEmojis[status.toLowerCase()] || '\u26AA'; // ⚪ default
}

/** Map Jira priority name back to severity for accent color */
function priorityToSeverity(priority?: string): string | undefined {
  if (!priority) return undefined;
  const p = priority.toLowerCase();
  if (p === 'lowest' || p === 'low') return 'low';
  if (p === 'medium') return 'medium';
  if (p === 'high') return 'high';
  if (p === 'highest' || p === 'critical') return 'critical';
  return undefined;
}

export function buildTicketDMContainer(params: {
  ticketId: string;
  status: string;
  statusCategory?: string;
  assignee?: string;
  conversationMarkdown: string;
  botId: string;
  portalUrl: string;
  severity?: string;
  createdAt?: string;
}): ContainerBuilder {
  const accentColor = params.severity
    ? (severityAccentColors[params.severity] || BLURPLE)
    : BLURPLE;

  const statusEmoji = getStatusEmoji(params.status);
  const isDone = params.statusCategory === 'done';

  // Status line — keep it minimal
  let statusLine = `${statusEmoji} **${params.status}**`;
  if (params.assignee) statusLine += `  \u00b7  ${params.assignee}`;

  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${params.ticketId}`)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(statusLine)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(params.conversationMarkdown)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    );

  // Footer — creation time + last updated
  const footerParts: string[] = [];
  if (params.createdAt) {
    const createdTs = Math.floor(new Date(params.createdAt).getTime() / 1000);
    footerParts.push(`Opened <t:${createdTs}:R>`);
  }
  footerParts.push(`Updated <t:${Math.floor(Date.now() / 1000)}:R>`);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${footerParts.join('  \u00b7  ')}`)
  );

  // Action buttons — Reply + Close/Reopen + View on Portal
  const buttons: ButtonBuilder[] = [
    new ButtonBuilder()
      .setCustomId(`reply:${params.botId}:${params.ticketId}`)
      .setLabel('Reply')
      .setStyle(ButtonStyle.Primary),
  ];

  if (isDone) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`reopen_ticket:${params.botId}:${params.ticketId}`)
        .setLabel('Reopen')
        .setStyle(ButtonStyle.Secondary)
    );
  } else {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`close_ticket:${params.botId}:${params.ticketId}`)
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setLabel('View on Portal')
      .setStyle(ButtonStyle.Link)
      .setURL(params.portalUrl)
  );

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)
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
    console.log(`[Helpers] refreshTicketDM called: bot=${botId}, ticket=${ticketId}, user=${discordUserId}`);

    const tracker = await prisma.ticketDMTracker.findUnique({
      where: {
        tenantId_ticketId_discordUserId: {
          tenantId: botId,
          ticketId,
          discordUserId,
        },
      },
    });

    if (!tracker) {
      console.log('[Helpers] refreshTicketDM: no tracker found, returning');
      return;
    }

    const client = botManager.getBot(botId);
    if (!client) {
      console.log(`[Helpers] refreshTicketDM: no bot client for ${botId}`);
      return;
    }

    // Get ticket with comments
    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? getTicketProvider()
      : await getTicketProviderForTenant(botId);
    if (!provider) {
      console.log('[Helpers] refreshTicketDM: no provider available');
      return;
    }

    const ticket = await provider.getTicket(ticketId, discordUserId);
    if (!ticket) {
      console.log(`[Helpers] refreshTicketDM: getTicket returned null (ownership check failed?)`);
      return;
    }
    // Log comment details for debugging
    for (const c of ticket.comments) {
      console.log(`[Helpers] refreshTicketDM: comment id=${c.id}, isStaff=${c.isStaff}, bodyLen=${c.body.length}, author=${c.author}`);
    }
    console.log(`[Helpers] refreshTicketDM: ticket found, status=${ticket.status}, comments=${ticket.comments.length}`);

    const slug = await resolveTenantSlug(botId);
    const portalUrl = `https://${slug}.helpportal.app/support/tickets/${ticketId}`;
    const conversationMarkdown = formatConversationHistory(ticket.comments, portalUrl);
    console.log(`[Helpers] refreshTicketDM: conversationMarkdown length=${conversationMarkdown.length}, preview=${conversationMarkdown.substring(0, 200)}`);

    const container = buildTicketDMContainer({
      ticketId,
      status: ticket.status,
      statusCategory: ticket.statusCategory,
      assignee: ticket.assignee,
      conversationMarkdown,
      botId,
      portalUrl,
      severity: priorityToSeverity(ticket.priority),
      createdAt: ticket.created,
    });

    // Collect embeddable attachments from the latest staff comment (≤25MB, max 10)
    const discordFiles = await collectEmbeddableAttachments(ticket.comments, provider);

    const sendPayload = {
      components: [container],
      flags: [MessageFlags.IsComponentsV2] as const,
      ...(discordFiles.length > 0 ? { files: discordFiles } : {}),
    };

    try {
      // Edit via REST API directly — must explicitly clear content/embeds
      // and pass flags:32768 for CV2 edits per Discord API requirements
      const user = await client.users.fetch(discordUserId);
      const dmChannel = await user.createDM();

      const serialized = {
        content: null,
        embeds: [],
        components: [container.toJSON()],
        flags: Number(MessageFlags.IsComponentsV2),
      };

      if (discordFiles.length > 0) {
        // With files, use message.edit() for multipart handling but include cleared fields
        const message = await dmChannel.messages.fetch(tracker.dmMessageId);
        await message.edit({
          content: null,
          embeds: [],
          components: [container],
          flags: [MessageFlags.IsComponentsV2] as const,
          files: discordFiles,
        });
      } else {
        await client.rest.patch(
          Routes.channelMessage(dmChannel.id, tracker.dmMessageId),
          { body: serialized }
        );
      }
      console.log(`[Helpers] refreshTicketDM: edited existing DM (msgId=${tracker.dmMessageId}, files=${discordFiles.length})`);
    } catch (editErr) {
      console.warn('[Helpers] refreshTicketDM: edit failed, sending replacement DM:', (editErr as Error).message);
      // Message was deleted or inaccessible — send a new one
      try {
        const user = await client.users.fetch(discordUserId);
        const sent = await user.send(sendPayload);

        await prisma.ticketDMTracker.update({
          where: { id: tracker.id },
          data: {
            dmMessageId: sent.id,
            dmChannelId: sent.channelId,
          },
        });
        console.log(`[Helpers] refreshTicketDM: sent replacement DM (msgId=${sent.id})`);
      } catch (sendErr) {
        console.error('[Helpers] Failed to send replacement DM:', sendErr);
      }
    }
  } catch (error) {
    console.error('[Helpers] refreshTicketDM error:', error);
  }
}

// ==========================================
// ATTACHMENT EMBEDDING
// ==========================================

const MAX_DISCORD_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_DISCORD_FILES = 10;

/**
 * Collect embeddable attachments from the most recent staff comment.
 * Downloads files ≤25MB from Jira and returns them as Discord-ready buffers.
 * Only embeds from the latest staff comment to avoid re-uploading old attachments.
 */
async function collectEmbeddableAttachments(
  comments: TicketComment[],
  provider: { getAttachmentBuffer?(url: string): Promise<Buffer | null> }
): Promise<Array<{ attachment: Buffer; name: string }>> {
  if (!provider.getAttachmentBuffer) return [];

  // Find the latest staff comment with attachments
  const latestStaffWithAttachments = [...comments]
    .reverse()
    .find(c => c.isStaff && c.attachments && c.attachments.length > 0);

  if (!latestStaffWithAttachments?.attachments) return [];

  const embeddable = latestStaffWithAttachments.attachments
    .filter(a => a.size <= MAX_DISCORD_FILE_SIZE)
    .slice(0, MAX_DISCORD_FILES);

  const files: Array<{ attachment: Buffer; name: string }> = [];
  for (const att of embeddable) {
    try {
      const buffer = await provider.getAttachmentBuffer(att.url);
      if (buffer) {
        files.push({ attachment: buffer, name: att.filename });
      }
    } catch (err) {
      console.error(`[Helpers] Failed to download attachment ${att.filename}:`, err);
    }
  }

  return files;
}

// ==========================================
// CLOSE / REOPEN TICKET BUTTON HANDLERS
// ==========================================

/**
 * Handle "Close Ticket" button in DM.
 * Transitions ticket to Done, then refreshes the DM.
 */
export async function handleCloseTicketButton(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;
  const ticketId = parts.slice(2).join(':');

  try {
    await interaction.deferUpdate();

    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? getTicketProvider()
      : await getTicketProviderForTenant(botId);
    if (!provider) {
      return;
    }

    // Verify ownership
    const ticket = await provider.getTicket(ticketId, interaction.user.id);
    if (!ticket) return;

    // Transition to Done
    if (provider.transitionTicket) {
      await provider.transitionTicket(ticketId, 'Done');
    }

    // Refresh the DM to show updated status
    await refreshTicketDM(botId, ticketId, interaction.user.id);
  } catch (error) {
    console.error('[Helpers] Close ticket button error:', error);
  }
}

/**
 * Handle "Reopen" button in DM.
 * Transitions ticket back to To Do, then refreshes the DM.
 */
export async function handleReopenTicketButton(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;
  const ticketId = parts.slice(2).join(':');

  try {
    await interaction.deferUpdate();

    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? getTicketProvider()
      : await getTicketProviderForTenant(botId);
    if (!provider) {
      return;
    }

    // Verify ownership
    const ticket = await provider.getTicket(ticketId, interaction.user.id);
    if (!ticket) return;

    // Transition back to To Do
    if (provider.transitionTicket) {
      await provider.transitionTicket(ticketId, 'To Do');
    }

    // Refresh the DM to show updated status
    await refreshTicketDM(botId, ticketId, interaction.user.id);
  } catch (error) {
    console.error('[Helpers] Reopen ticket button error:', error);
  }
}
