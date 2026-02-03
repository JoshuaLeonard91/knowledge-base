/**
 * Discord Bot Log Channel
 *
 * Posts ticket activity to the configured log channel using Components V2.
 * Includes "Assign to me" button on ticket created logs for staff assignment.
 */

import {
  type ButtonInteraction,
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

export async function logTicketCreated(params: {
  botId: string;
  ticketId: string;
  summary: string;
  category: string;
  severity: string;
  discordUserId: string;
  discordUsername: string;
  avatarUrl?: string;
  guildName?: string;
  guildId?: string;
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

    await (channel as { send: Function }).send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error('[Log] Failed to log ticket created:', error);
  }
}

function buildTicketCreatedContainer(params: {
  botId: string;
  ticketId: string;
  summary: string;
  category: string;
  severity: string;
  status: string;
  discordUserId: string;
  discordUsername: string;
  avatarUrl?: string;
  guildName?: string;
  guildId?: string;
  assignedTo: { username: string; userId: string } | null;
}): ContainerBuilder {
  const accentColor = severityAccentColors[params.severity] || 0x5865f2;
  const sevLabel = params.severity.charAt(0).toUpperCase() + params.severity.slice(1);
  const statusEmoji = getStatusEmoji(params.status);
  const sevEmoji = getSeverityEmoji(params.severity);

  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${params.ticketId}\n${params.summary}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${statusEmoji} **${params.status}**  \u00b7  ${sevEmoji} **${sevLabel}**  \u00b7  ${params.category}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

  // Metadata block with user avatar thumbnail
  const metaLines = [`**Created by:** <@${params.discordUserId}>`];
  if (params.guildName) {
    metaLines.push(`**Server:** ${params.guildName}`);
  }
  if (params.assignedTo) {
    metaLines.push(`**Assigned to:** <@${params.assignedTo.userId}>`);
  }

  if (params.avatarUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(metaLines.join('\n'))
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(params.avatarUrl)
        )
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(metaLines.join('\n'))
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // Timestamp
  const timestamp = Math.floor(Date.now() / 1000);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# <t:${timestamp}:R>`)
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

      if (provider.assignTicket) {
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
      const creatorId = extractDiscordUserIdFromTexts(originalTexts);

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
 * Returns an array of text content strings from the message components.
 */
function extractTextFromMessage(message: { components: unknown[] }): string[] {
  const texts: string[] = [];
  try {
    for (const row of message.components) {
      const r = row as Record<string, unknown>;
      if (r && typeof r === 'object' && 'data' in r) {
        const data = r.data as Record<string, unknown>;
        // TextDisplay components have content directly in data
        if (data && typeof data.content === 'string') {
          texts.push(data.content);
        }
      }
      // Also check nested components (ActionRow wraps child components)
      if (r && typeof r === 'object' && 'components' in r && Array.isArray(r.components)) {
        for (const comp of r.components) {
          const c = comp as Record<string, unknown>;
          if (c && typeof c === 'object' && 'data' in c) {
            const cData = c.data as Record<string, unknown>;
            if (cData && typeof cData.content === 'string') {
              texts.push(cData.content);
            }
          }
        }
      }
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
  // Try to find severity from original text to keep accent color
  let accentColor = 0xfee75c; // default to yellow (in progress)
  const severityMatch = params.originalTexts.find(t => t.includes('**'));
  if (severityMatch) {
    if (severityMatch.includes('Critical')) accentColor = 0xed4245;
    else if (severityMatch.includes('High')) accentColor = 0xe67e22;
    else if (severityMatch.includes('Medium')) accentColor = 0xfee75c;
    else if (severityMatch.includes('Low')) accentColor = 0x57f287;
  }

  // Get original heading (ticket ID + summary)
  const heading = params.originalTexts[0] || `# ${params.ticketId}`;

  // Get the status/severity/category info line (contains · separators)
  const infoLine = params.originalTexts.find(t => t.includes('\u00b7')) || '';
  // Replace the old status with In Progress
  const updatedInfoLine = infoLine.replace(/[^\s]+ \*\*\w+\*\*/, '\u{1F7E1} **In Progress**');

  // Get original metadata text (created by, server)
  const metaText = params.originalTexts.find(t => t.includes('**Created by:**')) || '';

  // Build metadata with assignee
  const metaLines = metaText.split('\n').filter(l => l.includes('**Created by:**') || l.includes('**Server:**'));
  metaLines.push(`**Assigned to:** <@${params.assignedTo.userId}>`);
  if (!params.assignedInJira) {
    metaLines.push('-# Jira assignment failed \u2014 check account ID in dashboard.');
  }

  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(heading))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(updatedInfoLine || '\u{1F7E1} **In Progress**'))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));

  if (params.avatarUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(metaLines.join('\n'))
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(params.avatarUrl)
        )
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(metaLines.join('\n')));
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
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

    if (!provider || !provider.transitionTicket) return;

    await provider.transitionTicket(ticketId, 'Done');

    // Rebuild the log message with updated status
    const message = interaction.message;
    if (message) {
      const originalTexts = extractTextFromMessage(message);
      const heading = originalTexts[0] || `# ${ticketId}`;
      const infoLine = originalTexts.find(t => t.includes('\u00b7')) || '';
      const metaText = originalTexts.find(t => t.includes('**Created by:**')) || '';

      // Replace status in info line
      const resolvedInfoLine = infoLine.replace(/[^\s]+ \*\*[\w\s]+\*\*/, '\u2705 **Resolved**');

      // Build metadata
      const metaLines = metaText.split('\n').filter(l =>
        l.includes('**Created by:**') || l.includes('**Server:**') || l.includes('**Assigned to:**')
      );
      metaLines.push(`**Resolved by:** <@${interaction.user.id}>`);

      const container = new ContainerBuilder()
        .setAccentColor(0x57f287) // green for resolved
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(heading))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(resolvedInfoLine || '\u2705 **Resolved**'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(metaLines.join('\n')))
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

      // Refresh the ticket creator's DM
      const creatorId = extractDiscordUserIdFromTexts(originalTexts);
      if (creatorId) {
        refreshTicketDM(botId, ticketId, creatorId).catch((err) =>
          console.error('[Log] Failed to refresh creator DM after resolve:', err)
        );
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
      const heading = originalTexts[0] || `# ${ticketId}`;
      const infoLine = originalTexts.find(t => t.includes('\u00b7')) || '';
      const metaText = originalTexts.find(t => t.includes('**Created by:**')) || '';

      // Detect severity for accent color
      let accentColor = 0x5865f2;
      if (infoLine.includes('Critical')) accentColor = 0xed4245;
      else if (infoLine.includes('High')) accentColor = 0xe67e22;
      else if (infoLine.includes('Medium')) accentColor = 0xfee75c;
      else if (infoLine.includes('Low')) accentColor = 0x57f287;

      // Replace status in info line
      const reopenedInfoLine = infoLine.replace(/[^\s]+ \*\*[\w\s]+\*\*/, '\u{1F7E2} **Open**');

      // Build metadata
      const metaLines = metaText.split('\n').filter(l =>
        l.includes('**Created by:**') || l.includes('**Server:**')
      );
      metaLines.push(`**Reopened by:** <@${interaction.user.id}>`);

      const container = new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(heading))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(reopenedInfoLine || '\u{1F7E2} **Open**'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(metaLines.join('\n')))
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

      // Refresh the ticket creator's DM
      const creatorId = extractDiscordUserIdFromTexts(originalTexts);
      if (creatorId) {
        refreshTicketDM(botId, ticketId, creatorId).catch((err) =>
          console.error('[Log] Failed to refresh creator DM after reopen:', err)
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
