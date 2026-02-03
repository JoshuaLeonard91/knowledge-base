/**
 * Button + Modal Interaction Handlers
 *
 * Handles:
 * - "Reply" button click → opens modal with text input
 * - Modal submit → adds comment to ticket via provider
 *
 * Custom ID format: "reply:{tenantId}:{ticketId}"
 */

import {
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import { refreshTicketDM } from '../helpers';
import { MAIN_DOMAIN_BOT_ID } from '../constants';

/**
 * Handle button clicks and modal submissions
 */
export async function handleButtonInteraction(
  interaction: Interaction,
  _tenantId: string
): Promise<void> {
  if (interaction.isButton()) {
    await handleReplyButton(interaction);
  } else if (interaction.isModalSubmit()) {
    await handleReplyModal(interaction);
  }
}

/**
 * "Reply" button → open modal
 */
async function handleReplyButton(
  interaction: ButtonInteraction
): Promise<void> {
  const customId = interaction.customId;
  if (!customId.startsWith('reply:')) return;

  const parts = customId.split(':');
  if (parts.length !== 3) return;

  const [, tenantId, ticketId] = parts;

  const modal = new ModalBuilder()
    .setCustomId(`reply-modal:${tenantId}:${ticketId}`)
    .setTitle(`Reply to Ticket ${ticketId}`);

  const messageInput = new TextInputBuilder()
    .setCustomId('message')
    .setLabel('Your reply')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Type your reply here...')
    .setMinLength(1)
    .setMaxLength(4000)
    .setRequired(true);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
    messageInput
  );

  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * Modal submit → add comment to ticket
 */
async function handleReplyModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const customId = interaction.customId;
  if (!customId.startsWith('reply-modal:')) return;

  const parts = customId.split(':');
  if (parts.length !== 3) return;

  const [, tenantId, ticketId] = parts;

  await interaction.deferReply({ ephemeral: true });

  try {
    const message = interaction.fields.getTextInputValue('message');

    if (!message || message.trim().length === 0) {
      await interaction.editReply({
        content: 'Reply cannot be empty.',
      });
      return;
    }

    // Resolve provider: main domain uses env vars, tenants use DB
    const provider = tenantId === MAIN_DOMAIN_BOT_ID
      ? (getTicketProvider().isAvailable() ? getTicketProvider() : null)
      : await getTicketProviderForTenant(tenantId);

    if (!provider) {
      await interaction.editReply({
        content: 'Ticketing is not available. Please use the support portal.',
      });
      return;
    }

    const success = await provider.addComment({
      ticketId,
      message: message.trim(),
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.username,
    });

    if (!success) {
      await interaction.editReply({
        content:
          'Failed to add your reply. You may not have permission or the ticket may be closed.',
      });
      return;
    }

    await interaction.editReply({
      content: `Reply added to ticket **${ticketId}**.`,
    });

    // Fire-and-forget: refresh the DM with the new reply
    refreshTicketDM(tenantId, ticketId, interaction.user.id)
      .catch(err => console.error('[ReplyModal] DM refresh failed:', err));
  } catch (error) {
    console.error('[ReplyModal] Error:', error);
    await interaction.editReply({
      content: 'An error occurred while submitting your reply.',
    });
  }
}
