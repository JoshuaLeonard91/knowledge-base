/**
 * Ticket Reply Handler
 *
 * Handles staff replies to tickets from private ticket channels.
 * - ticket_reply:{botId}:{ticketId} button → shows modal
 * - ticket_reply_modal:{botId}:{ticketId} modal submit → posts comment + DMs user
 */

import {
  type ButtonInteraction,
  type ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { prisma } from '@/lib/db/client';
import { botManager } from '../manager';
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import { MAIN_DOMAIN_BOT_ID } from '../constants';
import { resolveTenantSlug } from '../helpers';

// ==========================================
// REPLY BUTTON → SHOW MODAL
// ==========================================

export async function handleReplyButton(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;

  const ticketId = parts.slice(2).join(':');

  try {
    // Staff check - must be in StaffMapping
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

    // Show reply modal
    const modal = new ModalBuilder()
      .setCustomId(`ticket_reply_modal:${botId}:${ticketId}`)
      .setTitle(`Reply to Ticket`);

    const replyInput = new TextInputBuilder()
      .setCustomId('reply_content')
      .setLabel('Your Reply')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Type your reply to the user...')
      .setMinLength(1)
      .setMaxLength(4000)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(replyInput)
    );

    await interaction.showModal(modal);
  } catch (error) {
    console.error('[Reply] Error showing modal:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred. Please try again.',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {
      // Already replied
    }
  }
}

// ==========================================
// REPLY MODAL SUBMIT → POST COMMENT + DM USER
// ==========================================

export async function handleReplyModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length < 3) return;

  const [, botId, ...ticketIdParts] = parts;
  const ticketId = ticketIdParts.join(':');

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const replyContent = interaction.fields.getTextInputValue('reply_content');

    if (!replyContent.trim()) {
      await interaction.editReply({
        content: 'Please enter a reply message.',
      });
      return;
    }

    // Get the ticket channel record to find the user's Discord ID
    const ticketChannelRecord = await prisma.ticketChannel.findUnique({
      where: {
        tenantId_ticketId: {
          tenantId: botId,
          ticketId,
        },
      },
    });

    if (!ticketChannelRecord) {
      await interaction.editReply({
        content: 'Ticket channel record not found. The ticket may have been resolved.',
      });
      return;
    }

    // Get provider to post comment to Jira
    const provider = botId === MAIN_DOMAIN_BOT_ID
      ? (() => { const p = getTicketProvider(); return p.isAvailable() ? p : null; })()
      : await getTicketProviderForTenant(botId);

    // Post comment to Jira (if provider available)
    let commentPosted = false;
    if (provider) {
      try {
        // Use addStaffComment if available, otherwise fall back to addComment
        if (provider.addStaffComment) {
          const result = await provider.addStaffComment(
            ticketId,
            replyContent,
            interaction.user.username,
            interaction.user.id
          );
          commentPosted = result.success;
        } else if (provider.addComment) {
          await provider.addComment({
            ticketId,
            message: `**${interaction.user.username}** (via Discord):\n\n${replyContent}`,
            discordUserId: interaction.user.id,
            discordUsername: interaction.user.username,
          });
          commentPosted = true;
        }
      } catch (error) {
        console.error('[Reply] Failed to post comment to Jira:', error);
      }
    }

    // Send DM to the ticket creator
    const client = botManager.getBot(botId);
    let dmSent = false;

    if (client && ticketChannelRecord.discordUserId) {
      try {
        const user = await client.users.fetch(ticketChannelRecord.discordUserId);
        const slug = await resolveTenantSlug(botId);

        const dmContainer = new ContainerBuilder()
          .setAccentColor(0x5865f2) // blurple for staff reply
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# Staff Reply \u2014 ${ticketId}`)
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**From:** ${interaction.user.username}\n\n${replyContent}`
            )
          )
          .addSeparatorComponents(
            new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
          )
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# To reply, visit your [support portal](https://${slug}.helpportal.app/support/tickets/${ticketId}) or respond in Discord.`
            )
          );

        await user.send({
          components: [dmContainer],
          flags: MessageFlags.IsComponentsV2,
        });
        dmSent = true;
      } catch (error) {
        console.error('[Reply] Failed to send DM to user:', error);
      }
    }

    // Post confirmation in the ticket channel
    const confirmationLines: string[] = [
      `**Your reply has been sent!**`,
      ``,
      `> ${replyContent.substring(0, 200)}${replyContent.length > 200 ? '...' : ''}`,
    ];

    if (!commentPosted) {
      confirmationLines.push(``, `-# Note: Could not post to Jira. The user was notified via DM.`);
    }

    if (!dmSent) {
      confirmationLines.push(``, `-# Note: Could not DM the user. They may have DMs disabled.`);
    }

    // Also post a record of the reply in the ticket channel for context
    const ticketChannel = await client?.channels.fetch(ticketChannelRecord.channelId);
    if (ticketChannel?.isTextBased()) {
      const recordContainer = new ContainerBuilder()
        .setAccentColor(0x5865f2)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${interaction.user.username}** replied:`)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`> ${replyContent.replace(/\n/g, '\n> ')}`)
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`-# Sent <t:${Math.floor(Date.now() / 1000)}:R>`)
        );

      await (ticketChannel as { send: Function }).send({
        components: [recordContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    await interaction.editReply({
      content: confirmationLines.join('\n'),
    });

    console.log(`[Reply] Staff ${interaction.user.username} replied to ${ticketId}`);
  } catch (error) {
    console.error('[Reply] Error processing reply:', error);
    await interaction.editReply({
      content: 'An error occurred while sending your reply. Please try again.',
    });
  }
}
