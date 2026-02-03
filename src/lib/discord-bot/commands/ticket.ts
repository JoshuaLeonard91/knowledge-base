/**
 * /ticket Command — Multi-Step Component Flow
 *
 * Flow:
 * 1. /ticket → Category dropdown (from CMS)
 * 2. Select category → Severity buttons
 * 3. Click severity → Modal with Title + Description
 * 4. Submit modal → Create ticket → Confirmation embed
 *
 * State is passed between steps via customId strings:
 *   ticket_category:{tenantId}
 *   ticket_severity:{tenantId}:{categoryId}:{severity}
 *   ticket_modal:{tenantId}:{categoryId}:{severity}
 */

import {
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import { getTicketCategoriesForTenant } from '@/lib/cms';

// ==========================================
// STEP 1: /ticket → Show category dropdown
// ==========================================

export async function handleTicketCommand(
  interaction: ChatInputCommandInteraction,
  tenantId: string
): Promise<void> {
  try {
    // Fetch categories from CMS for this tenant (or defaults)
    const categories = await getTicketCategoriesForTenant(tenantId);

    if (!categories || categories.length === 0) {
      await interaction.reply({
        content: 'No ticket categories are configured. Ask the server admin to set up categories.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`ticket_category:${tenantId}`)
      .setPlaceholder('Choose a category...')
      .addOptions(
        categories.slice(0, 25).map((cat) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat.name)
            .setValue(cat.id)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({
      content: '**Create a Support Ticket**\n\nStep 1 of 3 — Select a category:',
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[TicketCommand] Error showing categories:', error);
    await interaction.reply({
      content: 'An error occurred. Please try again later.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ==========================================
// STEP 2: Category selected → Show severity buttons
// ==========================================

// Cache category names for the session (populated in step 1, used in step 4)
const categoryNameCache = new Map<string, string>();

export async function handleTicketCategorySelect(
  interaction: StringSelectMenuInteraction,
  tenantId: string
): Promise<void> {
  try {
    const categoryId = interaction.values[0];

    // Look up category name from CMS for this tenant
    const categories = await getTicketCategoriesForTenant(tenantId);
    const category = categories.find((c) => c.id === categoryId);
    const categoryName = category?.name || categoryId;

    // Cache for later use in confirmation
    categoryNameCache.set(categoryId, categoryName);

    const severityRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:${categoryId}:low`)
        .setLabel('Low')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🟢'),
      new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:${categoryId}:medium`)
        .setLabel('Medium')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🟡'),
      new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:${categoryId}:high`)
        .setLabel('High')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🟠'),
      new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:${categoryId}:critical`)
        .setLabel('Critical')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴'),
    );

    await interaction.update({
      content: `**Create a Support Ticket**\n\n**Category:** ${categoryName}\n\nStep 2 of 3 — Select severity:`,
      components: [severityRow],
    });
  } catch (error) {
    console.error('[TicketCommand] Error showing severity:', error);
    try {
      await interaction.update({
        content: 'An error occurred. Please run `/ticket` again.',
        components: [],
      });
    } catch {
      // Interaction may have expired
    }
  }
}

// ==========================================
// STEP 3: Severity selected → Open modal
// ==========================================

export async function handleTicketSeverityButton(
  interaction: ButtonInteraction
): Promise<void> {
  try {
    const parts = interaction.customId.split(':');
    if (parts.length !== 4) return;

    const [, tenantId, categoryId, severity] = parts;

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal:${tenantId}:${categoryId}:${severity}`)
      .setTitle('Describe Your Issue');

    const titleInput = new TextInputBuilder()
      .setCustomId('ticket_title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Brief summary of the issue')
      .setMinLength(5)
      .setMaxLength(100)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('ticket_description')
      .setLabel('Description')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Provide details about the issue...')
      .setMinLength(10)
      .setMaxLength(4000)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    );

    // showModal MUST be the first response to this interaction
    await interaction.showModal(modal);
  } catch (error) {
    console.error('[TicketCommand] Error showing modal:', error);
  }
}

// ==========================================
// STEP 4: Modal submitted → Create ticket
// ==========================================

const severityToPriority: Record<string, 'lowest' | 'low' | 'medium' | 'high' | 'highest'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'highest',
};

const severityColors: Record<string, number> = {
  low: 0x57f287,      // green
  medium: 0x5865f2,   // blurple
  high: 0xed4245,     // red
  critical: 0xed4245, // red
};

export async function handleTicketModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, tenantId, categoryId, severity] = parts;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const title = interaction.fields.getTextInputValue('ticket_title');
    const description = interaction.fields.getTextInputValue('ticket_description');

    const provider = await getTicketProviderForTenant(tenantId);
    if (!provider) {
      await interaction.editReply({
        content: 'Ticketing is not configured for this server. Ask the server admin to set up a ticket provider.',
      });
      return;
    }

    const categoryName = categoryNameCache.get(categoryId) || categoryId;
    const priority = severityToPriority[severity] || 'medium';

    const summary = `[${categoryName}] ${title}`;
    const labels = [
      'discord',
      'discord-bot',
      `category-${categoryId}`,
      `severity-${severity}`,
    ];

    const result = await provider.createTicket({
      summary,
      description,
      priority,
      labels,
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.username,
      discordServerId: interaction.guildId || undefined,
    });

    if (!result.success) {
      await interaction.editReply({
        content: 'Failed to create ticket. Please try again later or use the support portal.',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(severityColors[severity] || 0x5865f2)
      .setTitle(`Ticket Created — ${result.ticketId}`)
      .addFields(
        { name: 'Category', value: categoryName, inline: true },
        { name: 'Severity', value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
        { name: 'Status', value: 'Open', inline: true },
        { name: 'Title', value: title },
        { name: 'Description', value: description.length > 1024 ? description.substring(0, 1021) + '...' : description },
      )
      .setFooter({ text: `Created by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({
      content: '',
      embeds: [embed],
    });
  } catch (error) {
    console.error('[TicketCommand] Error creating ticket:', error);
    await interaction.editReply({
      content: 'An error occurred while creating your ticket. Please try again later.',
    });
  }
}
