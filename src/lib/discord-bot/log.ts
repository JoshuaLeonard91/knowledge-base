/**
 * Discord Bot Log Channel
 *
 * Posts ticket activity to the configured log channel using Components V2.
 * Includes "Assign to me" button on ticket created logs for staff assignment.
 */

import {
  type ButtonInteraction,
  type TextChannel,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { prisma } from '@/lib/db/client';
import { botManager } from './manager';
import { getBotSetup } from './helpers';
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import { MAIN_DOMAIN_BOT_ID } from './constants';
import { refreshTicketDM } from './helpers';

// ==========================================
// EMOJI MAPS
// ==========================================

const severityAccentColors: Record<string, number> = {
  low: 0x57f287,
  medium: 0xfee75c,
  high: 0xe67e22,
  critical: 0xed4245,
};

const severityEmojis: Record<string, string> = {
  low: '\u{1F7E2}',       // 🟢
  medium: '\u{1F7E1}',    // 🟡
  high: '\u{1F7E0}',      // 🟠
  critical: '\u{1F534}',  // 🔴
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

function getSeverityEmoji(severity: string): string {
  return severityEmojis[severity.toLowerCase()] || '';
}

// ==========================================
// ASSIGNMENT TRACKING (In-Memory)
// ==========================================

interface AssignmentRecord {
  userId: string;
  username: string;
  assignedAt: number;
}

const assignmentMap = new Map<string, AssignmentRecord>();

const REASSIGN_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function assignmentKey(botId: string, ticketId: string): string {
  return `${botId}:${ticketId}`;
}

// ==========================================
// LOG: TICKET CREATED (V2 Container)
// ==========================================

export interface TicketAttachmentInfo {
  name: string;
  url: string;
  size: number;
  contentType?: string;
}

export async function logTicketCreated(params: {
  botId: string;
  ticketId: string;
  summary: string;
  description: string;
  category: string;
  severity: string;
  discordUserId: string;
  discordUsername: string;
  avatarUrl?: string;
  guildName?: string;
  guildId?: string;
  attachments?: TicketAttachmentInfo[];
  portalUrl?: string;
}): Promise<void> {
  try {
    const setup = await getBotSetup(params.botId);
    if (!setup?.logChannelId) return;

    const client = botManager.getBot(params.botId);
    if (!client) return;

    const channel = await client.channels.fetch(setup.logChannelId);
    if (!channel || !channel.isTextBased()) return;

    const container = buildTicketCreatedContainer({
      ...params,
      status: 'Open',
      assignedTo: null,
    });

    const message = await (channel as { send: Function }).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    // Save message ID for later updates (status changes, assignments via webhook)
    await prisma.ticketLogMessage.upsert({
      where: {
        tenantId_ticketId: {
          tenantId: params.botId,
          ticketId: params.ticketId,
        },
      },
      create: {
        tenantId: params.botId,
        ticketId: params.ticketId,
        channelId: setup.logChannelId,
        messageId: message.id,
        discordUserId: params.discordUserId,
      },
      update: {
        channelId: setup.logChannelId,
        messageId: message.id,
        discordUserId: params.discordUserId,
      },
    });
  } catch (error) {
    console.error('[Log] Failed to log ticket created:', error);
  }
}

function buildTicketCreatedContainer(params: {
  botId: string;
  ticketId: string;
  summary: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  discordUserId: string;
  discordUsername: string;
  avatarUrl?: string;
  guildName?: string;
  guildId?: string;
  assignedTo: { username: string; userId: string } | null;
  attachments?: TicketAttachmentInfo[];
  portalUrl?: string;
}): ContainerBuilder {
  const accentColor = severityAccentColors[params.severity] || 0x5865f2;
  const sevLabel = params.severity.charAt(0).toUpperCase() + params.severity.slice(1);
  const statusEmoji = getStatusEmoji(params.status);
  const sevEmoji = getSeverityEmoji(params.severity);

  const container = new ContainerBuilder()
    .setAccentColor(accentColor);

  // Header with avatar, ticket ID as title, italicized summary below
  const headerContent = `## ${params.ticketId}\n*Summary: ${params.summary}*`;
  if (params.avatarUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(headerContent)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(params.avatarUrl)
        )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerContent)
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // Info fields - using monospace code block for proper alignment
  // Pad labels to 11 chars (longest is "Created by:")
  const ticketDisplay = params.ticketId;
  const assigneeDisplay = params.assignedTo ? params.assignedTo.username : 'Unassigned';
  const serverLine = params.guildName ? `\nServer:     ${params.guildName}` : '';

  const codeBlock = [
    '```',
    `Category:   ${params.category}`,
    `Ticket:     ${ticketDisplay}`,
    `Status:     ${params.status}`,
    `Priority:   ${sevLabel}`,
    `Assignee:   ${assigneeDisplay}`,
    '```',
  ].join('\n');

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(codeBlock)
  );

  // Created by outside code block so mention works
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**Created by:** <@${params.discordUserId}>${serverLine ? `\n**Server:** ${params.guildName}` : ''}`)
  );

  // Description preview (truncated)
  if (params.description && params.description.trim()) {
    const descPreview = params.description.length > 300
      ? params.description.substring(0, 297) + '...'
      : params.description;

    container
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Description:**\n> ${descPreview.replace(/\n/g, '\n> ')}`)
      );
  }

  // Attachments list
  if (params.attachments && params.attachments.length > 0) {
    const attachmentList = params.attachments
      .slice(0, 5) // Max 5 attachments shown
      .map(a => `\u{1F4CE} [${a.name}](${a.url})`)
      .join('\n');

    const moreCount = params.attachments.length > 5 ? ` *(+${params.attachments.length - 5} more)*` : '';

    container
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Attachments:**\n${attachmentList}${moreCount}`)
      );
  }

  // Timestamp
  container
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# Created <t:${Math.floor(Date.now() / 1000)}:R>`)
    );

  // Action buttons: Assign + Resolve/Reopen
  const assignLabel = params.assignedTo ? 'Reassign to me' : 'Assign to me';
  const buttons: ButtonBuilder[] = [
    new ButtonBuilder()
      .setCustomId(`assign_ticket:${params.botId}:${params.ticketId}`)
      .setLabel(assignLabel)
      .setStyle(params.assignedTo ? ButtonStyle.Secondary : ButtonStyle.Primary),
  ];

  const isDone = params.status.toLowerCase() === 'resolved' || params.status.toLowerCase() === 'closed' || params.status.toLowerCase() === 'done';
  if (isDone) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`reopen_staff:${params.botId}:${params.ticketId}`)
        .setLabel('Reopen')
        .setStyle(ButtonStyle.Secondary)
    );
  } else {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`resolve_ticket:${params.botId}:${params.ticketId}`)
        .setLabel('Resolve')
        .setStyle(ButtonStyle.Success)
    );
  }

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)
  );

  return container;
}

// ==========================================
// HANDLE "ASSIGN TO ME" BUTTON
// ==========================================

export async function handleAssignButton(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;

  const ticketId = parts.slice(2).join(':'); // handle colons in ticket ID

  try {
    // Staff-only gate
    const staffMapping = await prisma.staffMapping.findUnique({
      where: {
        botId_discordUserId: {
          botId,
          discordUserId: interaction.user.id,
        },
      },
    });

    if (!staffMapping) {
      await interaction.reply({
        content: 'You are not registered as staff. Ask your admin to add you in the dashboard.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check cooldown
    const key = assignmentKey(botId, ticketId);
    const existing = assignmentMap.get(key);

    if (existing && existing.userId !== interaction.user.id) {
      const elapsed = Date.now() - existing.assignedAt;
      if (elapsed < REASSIGN_COOLDOWN_MS) {
        await interaction.reply({
          content: `This ticket is already assigned to **${existing.username}**. Please try again later.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await interaction.deferUpdate();

    // Resolve ticket provider
    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? (() => { const p = getTicketProvider(); return p.isAvailable() ? p : null; })()
      : await getTicketProviderForTenant(botId);

    // Add comment + assign + transition in Jira
    let assignedInJira = false;
    if (provider) {
      const commentText = `Claimed by ${interaction.user.username} via Discord`;
      await provider.addComment({
        ticketId,
        message: commentText,
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.username,
      });

      // Only assign in Jira if staff has a Jira account ID
      if (provider.assignTicket && staffMapping.jiraAccountId) {
        assignedInJira = await provider.assignTicket(ticketId, staffMapping.jiraAccountId);
      }

      // Transition to "In Progress"
      if (provider.transitionTicket) {
        await provider.transitionTicket(ticketId, 'In Progress');
      }
    }

    // Update assignment tracking
    assignmentMap.set(key, {
      userId: interaction.user.id,
      username: interaction.user.username,
      assignedAt: Date.now(),
    });

    // --- Create private ticket channel for assigned mod ---
    const setup = await getBotSetup(botId);
    const guild = interaction.guild;
    const client = botManager.getBot(botId);

    if (setup?.supportCategoryId && guild && client?.user) {
      // Check if channel already exists for this ticket
      const existingChannel = await prisma.ticketChannel.findUnique({
        where: {
          tenantId_ticketId: {
            tenantId: botId,
            ticketId,
          },
        },
      });

      if (!existingChannel) {
        try {
          // Create private channel under Support category
          const privateChannel = await guild.channels.create({
            name: `ticket-${ticketId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
            type: ChannelType.GuildText,
            parent: setup.supportCategoryId,
            permissionOverwrites: [
              {
                id: guild.id, // @everyone: hidden
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.user.id, // assigned mod: full access
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
              {
                id: guild.ownerId, // server owner: full access
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
              {
                id: client.user.id, // bot: full access
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ManageMessages,
                  PermissionFlagsBits.EmbedLinks,
                ],
              },
            ],
          });

          // Extract original message data to post in the channel
          const originalMessage = interaction.message;
          const originalTexts = extractTextFromMessage(originalMessage);
          const creatorId = extractDiscordUserIdFromTexts(originalTexts);

          // Get ticket description from message
          const descBlock = originalTexts.find(t => t.includes('**Description:**'));
          const description = descBlock ? descBlock.replace('**Description:**', '').replace(/^[\s>]+/gm, '').trim() : '';

          // Get ticket summary from heading
          const heading = originalTexts[0] || '';
          const summary = heading.replace(/^#+\s*/, '');

          // Get the ticket creator's username
          let creatorUsername = 'User';
          if (creatorId) {
            try {
              const creatorUser = await client.users.fetch(creatorId);
              creatorUsername = creatorUser.username;
            } catch { /* use default */ }
          }

          // Build initial message for the private channel
          const ticketChannelContainer = new ContainerBuilder()
            .setAccentColor(0xfee75c) // yellow for in progress
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`# Ticket ${ticketId}`)
            )
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Summary:** ${summary}\n` +
                `**Status:** \u{1F7E1} In Progress\n` +
                `**User:** <@${creatorId}>`
              )
            );

          if (description) {
            ticketChannelContainer
              .addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
              )
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Description:**\n> ${description.substring(0, 500).replace(/\n/g, '\n> ')}`)
              );
          }

          ticketChannelContainer
            .addSeparatorComponents(
              new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
            )
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`-# Use the button below to reply to <@${creatorId}>.`)
            )
            .addActionRowComponents(
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(`ticket_reply:${botId}:${ticketId}`)
                  .setLabel(`Reply to @${creatorUsername}`)
                  .setStyle(ButtonStyle.Primary)
              )
            );

          await (privateChannel as TextChannel).send({
            components: [ticketChannelContainer],
            flags: MessageFlags.IsComponentsV2,
          });

          // Save to database for tracking
          await prisma.ticketChannel.create({
            data: {
              tenantId: botId,
              ticketId,
              channelId: privateChannel.id,
              assignedModId: interaction.user.id,
              discordUserId: creatorId || '',
            },
          });

          console.log(`[Log] Created private ticket channel ${privateChannel.id} for ${ticketId}`);
        } catch (error) {
          console.error('[Log] Failed to create private ticket channel:', error);
          // Non-fatal: continue with assignment even if channel creation fails
        }
      }
    }

    // Rebuild the container with updated status + assignee
    // We need to extract the original params from the message content
    // Since we can't easily parse V2 containers, we rebuild from the assignment context
    // The message is edited in-place
    const message = interaction.message;
    if (message) {
      // Extract original data from the message text content
      // The first TextDisplay has "# TICKET-ID\nSummary"
      // We'll reconstruct the container with known data
      const originalTexts = extractTextFromMessage(message);
      console.log(`[Log] Assign: extracted ${originalTexts.length} texts from message:`, originalTexts.map((t, i) => `[${i}] ${t.substring(0, 80)}`));
      const creatorId = extractDiscordUserIdFromTexts(originalTexts);
      console.log(`[Log] Assign: creatorId=${creatorId}`);

      // Fetch creator avatar for thumbnail
      let avatarUrl: string | undefined;
      if (creatorId) {
        try {
          const creatorUser = await interaction.client.users.fetch(creatorId);
          avatarUrl = creatorUser.displayAvatarURL({ size: 64 });
        } catch {
          // Can't fetch — proceed without avatar
        }
      }

      const container = buildAssignedContainer({
        botId,
        ticketId,
        originalTexts,
        assignedTo: {
          username: interaction.user.username,
          userId: interaction.user.id,
        },
        assignedInJira,
        avatarUrl,
      });

      await interaction.editReply({
        components: [container],
      });

      // Refresh the ticket creator's DM to show "In Progress" + assignee
      if (creatorId) {
        refreshTicketDM(botId, ticketId, creatorId).catch((err) =>
          console.error('[Log] Failed to refresh creator DM after assignment:', err)
        );
        sendStatusNotification(botId, ticketId, creatorId, 'assigned', interaction.user.username).catch((err) =>
          console.error('[Log] Failed to send assign notification:', err)
        );
      }
    }
  } catch (error) {
    console.error('[Log] Assign button error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while assigning the ticket.',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {
      // Already replied
    }
  }
}

/**
 * Extract text display content from a V2 message for reconstruction.
 * Recursively walks all component nesting (Container > Section > TextDisplay, etc.)
 */
function extractTextFromMessage(message: { components: unknown[] }): string[] {
  const texts: string[] = [];

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;

    // Extract text content from data.content (TextDisplay components)
    if ('data' in obj) {
      const data = obj.data as Record<string, unknown>;
      if (data && typeof data.content === 'string') {
        texts.push(data.content);
      }
    }

    // Recurse into nested components arrays
    if ('components' in obj && Array.isArray(obj.components)) {
      for (const child of obj.components) {
        walk(child);
      }
    }

    // Section accessory (Thumbnail) — skip, but Section text is in components
  }

  try {
    for (const row of message.components) {
      walk(row);
    }
  } catch {
    // Fallback: return empty
  }
  return texts;
}

/**
 * Extract the ticket creator's Discord user ID from the metadata text.
 * Looks for the pattern `<@123456789>` in the "Created by" line.
 */
function extractDiscordUserIdFromTexts(texts: string[]): string | null {
  const createdByText = texts.find(t => t.includes('**Created by:**'));
  if (!createdByText) return null;
  const match = createdByText.match(/<@(\d{17,19})>/);
  return match ? match[1] : null;
}

/**
 * Build an updated container showing the ticket is now assigned.
 * Preserves original content while updating status + adding assignee.
 */
function buildAssignedContainer(params: {
  botId: string;
  ticketId: string;
  originalTexts: string[];
  assignedTo: { username: string; userId: string };
  assignedInJira: boolean;
  avatarUrl?: string;
}): ContainerBuilder {
  // Extract data from code block (new format) or markdown (old format)
  const codeBlock = params.originalTexts.find(t => t.startsWith('```'));
  const markdownBlock = params.originalTexts.find(t => t.includes('**Category:**'));

  let category = 'General';
  let priority = 'Medium';

  if (codeBlock) {
    const categoryMatch = codeBlock.match(/Category:\s+(.+)/);
    category = categoryMatch ? categoryMatch[1].trim() : 'General';
    const priorityMatch = codeBlock.match(/Priority:\s+(.+)/);
    priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';
  } else if (markdownBlock) {
    const categoryMatch = markdownBlock.match(/\*\*Category:\*\*\s*(.+)/);
    category = categoryMatch ? categoryMatch[1].split('\n')[0].trim() : 'General';
    const priorityMatch = markdownBlock.match(/\*\*Priority:\*\*\s*[^\s]*\s*(\w+)/);
    priority = priorityMatch ? priorityMatch[1] : 'Medium';
  }

  // Determine accent color from priority (yellow for in progress)
  const accentColor = 0xfee75c;

  // Get original heading (ticket ID + summary)
  const heading = params.originalTexts[0] || `## ${params.ticketId}`;

  // Get original metadata text (created by, server)
  const metaText = params.originalTexts.find(t => t.includes('**Created by:**')) || '';
  const serverMatch = metaText.match(/\*\*Server:\*\*\s*(.+)/);
  const serverName = serverMatch ? serverMatch[1].split('\n')[0].trim() : null;

  // Build code block for aligned info fields
  const codeBlockContent = [
    '```',
    `Category:   ${category}`,
    `Ticket:     ${params.ticketId}`,
    `Status:     In Progress`,
    `Priority:   ${priority}`,
    `Assignee:   ${params.assignedTo.username}`,
    '```',
  ].join('\n');

  // Build metadata lines
  const createdByMatch = metaText.match(/<@(\d{17,19})>/);
  const creatorId = createdByMatch ? createdByMatch[1] : '';
  let metaContent = `**Created by:** <@${creatorId}>`;
  if (serverName) {
    metaContent += `\n**Server:** ${serverName}`;
  }
  if (!params.assignedInJira) {
    metaContent += '\n-# Jira assignment skipped (no Jira account)';
  }

  const container = new ContainerBuilder()
    .setAccentColor(accentColor);

  // Top: avatar thumbnail + ticket heading
  if (params.avatarUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(heading))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(params.avatarUrl))
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(heading));
  }

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(codeBlockContent))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(metaContent))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Assigned <t:${Math.floor(Date.now() / 1000)}:R>`))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`assign_ticket:${params.botId}:${params.ticketId}`)
          .setLabel('Reassign to me')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`resolve_ticket:${params.botId}:${params.ticketId}`)
          .setLabel('Resolve')
          .setStyle(ButtonStyle.Success)
      )
    );

  return container;
}

// ==========================================
// LOG: TICKET COMMENT (V2 Container)
// ==========================================

export async function logTicketComment(params: {
  botId: string;
  ticketId: string;
  commentAuthor: string;
  commentPreview: string;
  isStaff: boolean;
}): Promise<void> {
  try {
    const setup = await getBotSetup(params.botId);
    if (!setup?.logChannelId) return;

    const client = botManager.getBot(params.botId);
    if (!client) return;

    const channel = await client.channels.fetch(setup.logChannelId);
    if (!channel || !channel.isTextBased()) return;

    const accentColor = params.isStaff ? 0x5865f2 : 0xfee75c;
    const typeLabel = params.isStaff ? 'Staff Reply' : 'User Reply';
    const preview = params.commentPreview.length > 200
      ? params.commentPreview.substring(0, 197) + '...'
      : params.commentPreview;

    const container = new ContainerBuilder()
      .setAccentColor(accentColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${params.ticketId}\n${typeLabel}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${params.commentAuthor}**\n> ${preview.replace(/\n/g, '\n> ')}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# <t:${Math.floor(Date.now() / 1000)}:R>`
        )
      );

    await (channel as { send: Function }).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error('[Log] Failed to log ticket comment:', error);
  }
}

// ==========================================
// HANDLE "RESOLVE" BUTTON (Staff)
// ==========================================

export async function handleResolveButton(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;
  const ticketId = parts.slice(2).join(':');

  try {
    // Staff-only gate
    const staffMapping = await prisma.staffMapping.findUnique({
      where: {
        botId_discordUserId: {
          botId,
          discordUserId: interaction.user.id,
        },
      },
    });

    if (!staffMapping) {
      await interaction.reply({
        content: 'You are not registered as staff.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();

    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? (() => { const p = getTicketProvider(); return p.isAvailable() ? p : null; })()
      : await getTicketProviderForTenant(botId);

    if (!provider || !provider.transitionTicket) {
      console.log(`[Log] Resolve: no provider or transitionTicket not supported`);
      return;
    }

    console.log(`[Log] Resolve: transitioning ${ticketId} to Done`);
    await provider.transitionTicket(ticketId, 'Done');

    // Delete the private ticket channel if it exists
    const ticketChannelRecord = await prisma.ticketChannel.findUnique({
      where: {
        tenantId_ticketId: {
          tenantId: botId,
          ticketId,
        },
      },
    });

    if (ticketChannelRecord) {
      try {
        const client = botManager.getBot(botId);
        if (client) {
          const ticketChannel = await client.channels.fetch(ticketChannelRecord.channelId);
          if (ticketChannel) {
            await ticketChannel.delete();
            console.log(`[Log] Deleted private ticket channel ${ticketChannelRecord.channelId} for ${ticketId}`);
          }
        }
      } catch (error) {
        console.error('[Log] Failed to delete private ticket channel:', error);
        // Non-fatal: continue with resolution even if channel deletion fails
      }

      // Remove from database
      await prisma.ticketChannel.delete({
        where: { id: ticketChannelRecord.id },
      });
    }

    // Rebuild the log message with updated status
    const message = interaction.message;
    if (message) {
      const originalTexts = extractTextFromMessage(message);
      console.log(`[Log] Resolve: extracted ${originalTexts.length} texts from message:`, originalTexts.map((t, i) => `[${i}] ${t.substring(0, 80)}`));
      const heading = originalTexts[0] || `## ${ticketId}`;
      const metaText = originalTexts.find(t => t.includes('**Created by:**')) || '';
      const creatorId = extractDiscordUserIdFromTexts(originalTexts);
      console.log(`[Log] Resolve: creatorId=${creatorId}, metaText=${metaText.substring(0, 100)}`);

      // Extract data from code block or markdown
      const codeBlock = originalTexts.find(t => t.startsWith('```'));
      const markdownBlock = originalTexts.find(t => t.includes('**Category:**'));

      let category = 'General';
      let priority = 'Medium';
      let assignee = 'Unassigned';

      if (codeBlock) {
        const categoryMatch = codeBlock.match(/Category:\s+(.+)/);
        category = categoryMatch ? categoryMatch[1].trim() : 'General';
        const priorityMatch = codeBlock.match(/Priority:\s+(.+)/);
        priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';
        const assigneeMatch = codeBlock.match(/Assignee:\s+(.+)/);
        assignee = assigneeMatch ? assigneeMatch[1].trim() : 'Unassigned';
      } else if (markdownBlock) {
        const categoryMatch = markdownBlock.match(/\*\*Category:\*\*\s*(.+)/);
        category = categoryMatch ? categoryMatch[1].split('\n')[0].trim() : 'General';
        const priorityMatch = markdownBlock.match(/\*\*Priority:\*\*\s*[^\s]*\s*(\w+)/);
        priority = priorityMatch ? priorityMatch[1] : 'Medium';
      }

      // Extract server name
      const serverMatch = metaText.match(/\*\*Server:\*\*\s*(.+)/);
      const serverName = serverMatch ? serverMatch[1].split('\n')[0].trim() : null;

      // Fetch creator avatar for thumbnail
      let avatarUrl: string | undefined;
      if (creatorId) {
        try {
          const creatorUser = await interaction.client.users.fetch(creatorId);
          avatarUrl = creatorUser.displayAvatarURL({ size: 64 });
        } catch { /* proceed without avatar */ }
      }

      // Build code block for aligned info fields
      const codeBlockContent = [
        '```',
        `Category:   ${category}`,
        `Ticket:     ${ticketId}`,
        `Status:     Resolved`,
        `Priority:   ${priority}`,
        `Assignee:   ${assignee}`,
        '```',
      ].join('\n');

      // Build metadata
      let metaContent = `**Created by:** <@${creatorId}>`;
      if (serverName) {
        metaContent += `\n**Server:** ${serverName}`;
      }
      metaContent += `\n**Resolved by:** <@${interaction.user.id}>`;

      const container = new ContainerBuilder()
        .setAccentColor(0x57f287); // green for resolved

      // Top: avatar thumbnail + heading
      if (avatarUrl) {
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(heading))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
        );
      } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(heading));
      }

      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(codeBlockContent))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(metaContent))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Resolved <t:${Math.floor(Date.now() / 1000)}:R>`))
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`assign_ticket:${botId}:${ticketId}`)
              .setLabel('Reassign to me')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId(`reopen_staff:${botId}:${ticketId}`)
              .setLabel('Reopen')
              .setStyle(ButtonStyle.Secondary)
          )
        );

      await interaction.editReply({ components: [container] });

      // Refresh the ticket creator's DM + send notification
      if (creatorId) {
        console.log(`[Log] Resolve: refreshing DM for creator ${creatorId}`);
        refreshTicketDM(botId, ticketId, creatorId).catch((err) =>
          console.error('[Log] Failed to refresh creator DM after resolve:', err)
        );
        sendStatusNotification(botId, ticketId, creatorId, 'resolved').catch((err) =>
          console.error('[Log] Failed to send resolve notification:', err)
        );
      } else {
        console.warn(`[Log] Resolve: creatorId not found in message — cannot refresh DM`);
      }
    }
  } catch (error) {
    console.error('[Log] Resolve button error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while resolving the ticket.',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch { /* Already replied */ }
  }
}

// ==========================================
// HANDLE "REOPEN" BUTTON (Staff)
// ==========================================

export async function handleReopenStaffButton(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;
  const ticketId = parts.slice(2).join(':');

  try {
    // Staff-only gate
    const staffMapping = await prisma.staffMapping.findUnique({
      where: {
        botId_discordUserId: {
          botId,
          discordUserId: interaction.user.id,
        },
      },
    });

    if (!staffMapping) {
      await interaction.reply({
        content: 'You are not registered as staff.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferUpdate();

    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? (() => { const p = getTicketProvider(); return p.isAvailable() ? p : null; })()
      : await getTicketProviderForTenant(botId);

    if (!provider || !provider.transitionTicket) return;

    await provider.transitionTicket(ticketId, 'To Do');

    // Rebuild the log message — show as Open again
    const message = interaction.message;
    if (message) {
      const originalTexts = extractTextFromMessage(message);
      const heading = originalTexts[0] || `## ${ticketId}`;
      const metaText = originalTexts.find(t => t.includes('**Created by:**')) || '';
      const creatorId = extractDiscordUserIdFromTexts(originalTexts);

      // Extract data from code block or markdown
      const codeBlock = originalTexts.find(t => t.startsWith('```'));
      const markdownBlock = originalTexts.find(t => t.includes('**Category:**'));

      let category = 'General';
      let priority = 'Medium';

      if (codeBlock) {
        const categoryMatch = codeBlock.match(/Category:\s+(.+)/);
        category = categoryMatch ? categoryMatch[1].trim() : 'General';
        const priorityMatch = codeBlock.match(/Priority:\s+(.+)/);
        priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';
      } else if (markdownBlock) {
        const categoryMatch = markdownBlock.match(/\*\*Category:\*\*\s*(.+)/);
        category = categoryMatch ? categoryMatch[1].split('\n')[0].trim() : 'General';
        const priorityMatch = markdownBlock.match(/\*\*Priority:\*\*\s*[^\s]*\s*(\w+)/);
        priority = priorityMatch ? priorityMatch[1] : 'Medium';
      }

      // Extract server name
      const serverMatch = metaText.match(/\*\*Server:\*\*\s*(.+)/);
      const serverName = serverMatch ? serverMatch[1].split('\n')[0].trim() : null;

      // Fetch creator avatar for thumbnail
      let avatarUrl: string | undefined;
      if (creatorId) {
        try {
          const creatorUser = await interaction.client.users.fetch(creatorId);
          avatarUrl = creatorUser.displayAvatarURL({ size: 64 });
        } catch { /* proceed without avatar */ }
      }

      // Detect accent color from priority
      let accentColor = 0x5865f2;
      const priorityLower = priority.toLowerCase();
      if (priorityLower === 'critical') accentColor = 0xed4245;
      else if (priorityLower === 'high') accentColor = 0xe67e22;
      else if (priorityLower === 'medium') accentColor = 0xfee75c;
      else if (priorityLower === 'low') accentColor = 0x57f287;

      // Build code block for aligned info fields
      const codeBlockContent = [
        '```',
        `Category:   ${category}`,
        `Ticket:     ${ticketId}`,
        `Status:     Open`,
        `Priority:   ${priority}`,
        `Assignee:   Unassigned`,
        '```',
      ].join('\n');

      // Build metadata
      let metaContent = `**Created by:** <@${creatorId}>`;
      if (serverName) {
        metaContent += `\n**Server:** ${serverName}`;
      }
      metaContent += `\n**Reopened by:** <@${interaction.user.id}>`;

      const container = new ContainerBuilder()
        .setAccentColor(accentColor);

      // Top: avatar thumbnail + heading
      if (avatarUrl) {
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(heading))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
        );
      } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(heading));
      }

      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(codeBlockContent))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(metaContent))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Reopened <t:${Math.floor(Date.now() / 1000)}:R>`))
        .addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`assign_ticket:${botId}:${ticketId}`)
              .setLabel('Assign to me')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`resolve_ticket:${botId}:${ticketId}`)
              .setLabel('Resolve')
              .setStyle(ButtonStyle.Success)
          )
        );

      await interaction.editReply({ components: [container] });

      // Refresh the ticket creator's DM + send notification
      if (creatorId) {
        refreshTicketDM(botId, ticketId, creatorId).catch((err) =>
          console.error('[Log] Failed to refresh creator DM after reopen:', err)
        );
        sendStatusNotification(botId, ticketId, creatorId, 'reopened').catch((err) =>
          console.error('[Log] Failed to send reopen notification:', err)
        );
      }
    }
  } catch (error) {
    console.error('[Log] Reopen staff button error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while reopening the ticket.',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch { /* Already replied */ }
  }
}

// ==========================================
// STATUS CHANGE NOTIFICATION DM
// ==========================================

/**
 * Send a brief new DM to the ticket creator when a status change happens.
 * Discord doesn't notify users on message edits, so this ensures they see the update.
 * The message auto-deletes after 30 seconds.
 */
async function sendStatusNotification(
  botId: string,
  ticketId: string,
  discordUserId: string,
  action: 'assigned' | 'resolved' | 'reopened',
  staffName?: string
): Promise<void> {
  const setup = await getBotSetup(botId);
  if (setup && !setup.dmOnUpdate) return;

  const client = botManager.getBot(botId);
  if (!client) return;

  const user = await client.users.fetch(discordUserId);
  if (!user) return;

  const messages: Record<string, string> = {
    assigned: `Your ticket **${ticketId}** has been assigned to **${staffName || 'a staff member'}** and is now **In Progress**.`,
    resolved: `Your ticket **${ticketId}** has been marked as **Resolved**.`,
    reopened: `Your ticket **${ticketId}** has been **Reopened**.`,
  };

  const sent = await user.send({ content: messages[action] });

  // Auto-delete after 30 seconds — the real info is in the edited DM
  setTimeout(async () => {
    try { await sent.delete(); } catch { /* Already deleted */ }
  }, 30_000);
}

// ==========================================
// REFRESH LOG MESSAGE (from webhook)
// ==========================================

/**
 * Refresh the ticket log channel message when status/assignment changes via webhook.
 * Looks up the stored message ID and edits it with updated info.
 */
export async function refreshTicketLogMessage(params: {
  botId: string;
  ticketId: string;
  status: string;
  statusCategory: string;
  assignee?: string | null;
  summary: string;
}): Promise<void> {
  try {
    // Look up the stored log message
    const tracker = await prisma.ticketLogMessage.findUnique({
      where: {
        tenantId_ticketId: {
          tenantId: params.botId,
          ticketId: params.ticketId,
        },
      },
    });

    if (!tracker) {
      console.log(`[Log] refreshTicketLogMessage: no tracker for ${params.ticketId}`);
      return;
    }

    const client = botManager.getBot(params.botId);
    if (!client) {
      console.log(`[Log] refreshTicketLogMessage: no bot client for ${params.botId}`);
      return;
    }

    const channel = await client.channels.fetch(tracker.channelId);
    if (!channel || !channel.isTextBased()) {
      console.log(`[Log] refreshTicketLogMessage: channel not found or not text-based`);
      return;
    }

    // Fetch the existing message
    let message;
    try {
      message = await (channel as { messages: { fetch: Function } }).messages.fetch(tracker.messageId);
    } catch {
      console.log(`[Log] refreshTicketLogMessage: message ${tracker.messageId} not found (deleted?)`);
      return;
    }

    // Extract original data from the message
    const originalTexts = extractTextFromMessage(message);

    // Find the heading (## TicketID\n*Summary: text*) - new format
    const existingHeading = originalTexts.find(t => t.startsWith('##'));
    // Use existing heading if present (preserves ticket ID + summary), otherwise build new one
    const heading = existingHeading || `## ${params.ticketId}\n*Summary: ${params.summary}*`;

    // Find the info block - could be code block (new) or markdown (old)
    const codeBlock = originalTexts.find(t => t.startsWith('```'));
    const markdownBlock = originalTexts.find(t => t.includes('**Category:**'));

    let category = 'General';
    let priority = 'Medium';
    let serverName: string | null = null;

    if (codeBlock) {
      // Extract from code block format: "Category:   Value"
      const categoryMatch = codeBlock.match(/Category:\s+(.+)/);
      category = categoryMatch ? categoryMatch[1].trim() : 'General';

      const priorityMatch = codeBlock.match(/Priority:\s+(.+)/);
      priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';
    } else if (markdownBlock) {
      // Extract from old markdown format: "**Category:** Value"
      const categoryMatch = markdownBlock.match(/\*\*Category:\*\*\s*(.+)/);
      category = categoryMatch ? categoryMatch[1].split('\n')[0].trim() : 'General';

      const priorityMatch = markdownBlock.match(/\*\*Priority:\*\*\s*[^\s]*\s*(\w+)/);
      priority = priorityMatch ? priorityMatch[1] : 'Medium';

      const serverMatch = markdownBlock.match(/\*\*Server:\*\*\s*(.+)/);
      serverName = serverMatch ? serverMatch[1].split('\n')[0].trim() : null;
    }

    // Check for server in Created by section (new format)
    const createdByBlock = originalTexts.find(t => t.includes('**Created by:**'));
    if (createdByBlock && !serverName) {
      const serverMatch = createdByBlock.match(/\*\*Server:\*\*\s*(.+)/);
      serverName = serverMatch ? serverMatch[1].split('\n')[0].trim() : null;
    }

    // Find description block if present
    const descBlock = originalTexts.find(t => t.includes('**Description:**'));
    const description = descBlock ? descBlock.replace('**Description:**', '').replace(/^[\s>]+/gm, '').trim() : null;

    // Determine status display
    const isDone = params.statusCategory === 'done';
    const isInProgress = params.statusCategory === 'indeterminate';
    let statusEmoji = '\u{1F7E2}'; // 🟢 Open
    let statusLabel = 'Open';

    if (isDone) {
      statusEmoji = '\u2705'; // ✅
      statusLabel = 'Resolved';
    } else if (isInProgress) {
      statusEmoji = '\u{1F7E1}'; // 🟡
      statusLabel = 'In Progress';
    }

    // Determine accent color from priority
    let accentColor = 0x5865f2;
    if (isDone) {
      accentColor = 0x57f287; // green for resolved
    } else {
      const priorityLower = priority.toLowerCase();
      if (priorityLower === 'critical') accentColor = 0xed4245;
      else if (priorityLower === 'high') accentColor = 0xe67e22;
      else if (priorityLower === 'medium') accentColor = 0xfee75c;
      else if (priorityLower === 'low') accentColor = 0x57f287;
    }

    // Fetch creator avatar
    let avatarUrl: string | undefined;
    try {
      const creatorUser = await client.users.fetch(tracker.discordUserId);
      avatarUrl = creatorUser.displayAvatarURL({ size: 64 });
    } catch { /* proceed without avatar */ }

    // Build code block for aligned info fields
    const assigneeDisplay = params.assignee || 'Unassigned';
    const codeBlockContent = [
      '```',
      `Category:   ${category}`,
      `Ticket:     ${params.ticketId}`,
      `Status:     ${statusLabel}`,
      `Priority:   ${priority}`,
      `Assignee:   ${assigneeDisplay}`,
      '```',
    ].join('\n');

    // Build updated container
    const container = new ContainerBuilder()
      .setAccentColor(accentColor);

    if (avatarUrl) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(heading))
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
      );
    } else {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(heading));
    }

    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(codeBlockContent));

    // Created by outside code block so mention works
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Created by:** <@${tracker.discordUserId}>${serverName ? `\n**Server:** ${serverName}` : ''}`)
    );

    // Add description if present
    if (description) {
      const descPreview = description.length > 300
        ? description.substring(0, 297) + '...'
        : description;

      container
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**Description:**\n> ${descPreview.replace(/\n/g, '\n> ')}`)
        );
    }

    // Timestamp
    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Updated <t:${Math.floor(Date.now() / 1000)}:R>`));

    // Add appropriate buttons based on status
    if (isDone) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`assign_ticket:${params.botId}:${params.ticketId}`)
            .setLabel('Reassign to me')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`reopen_staff:${params.botId}:${params.ticketId}`)
            .setLabel('Reopen')
            .setStyle(ButtonStyle.Secondary)
        )
      );
    } else {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`assign_ticket:${params.botId}:${params.ticketId}`)
            .setLabel(params.assignee ? 'Reassign to me' : 'Assign to me')
            .setStyle(params.assignee ? ButtonStyle.Secondary : ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`resolve_ticket:${params.botId}:${params.ticketId}`)
            .setLabel('Resolve')
            .setStyle(ButtonStyle.Success)
        )
      );
    }

    await message.edit({
      components: [container],
    });

    console.log(`[Log] refreshTicketLogMessage: updated ${params.ticketId} to ${statusLabel}`);
  } catch (error) {
    console.error('[Log] refreshTicketLogMessage error:', error);
  }
}
