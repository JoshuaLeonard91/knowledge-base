/**
 * /ticket Command — Interactive Component Flow
 *
 * Flow:
 * 1. /ticket → Single panel: category dropdown + severity buttons + Next
 * 2. Click Next → Modal with Title + Description
 * 3. Submit modal → Create ticket → Confirmation embed → Auto-dismiss
 *
 * State is passed between steps via customId strings:
 *   ticket_category:{tenantId}                         → select menu
 *   ticket_severity:{tenantId}:{severity}              → severity buttons
 *   ticket_next:{tenantId}                             → next button
 *   ticket_modal:{tenantId}:{categoryId}:{severity}    → modal
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
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import { getTicketCategories, getTicketCategoriesForTenant } from '@/lib/cms';
import { MAIN_DOMAIN_BOT_ID } from '../constants';

// ==========================================
// HELPERS
// ==========================================

function isMainDomain(tenantId: string): boolean {
  return tenantId === MAIN_DOMAIN_BOT_ID;
}

async function resolveCategories(tenantId: string) {
  return isMainDomain(tenantId)
    ? getTicketCategories()
    : getTicketCategoriesForTenant(tenantId);
}

async function resolveProvider(tenantId: string) {
  if (isMainDomain(tenantId)) {
    const provider = getTicketProvider();
    return provider.isAvailable() ? provider : null;
  }
  return getTicketProviderForTenant(tenantId);
}

// Per-user state for the ticket form (category + severity selection)
const userState = new Map<string, { category: string; categoryName: string; severity: string }>();

// Category name cache (avoid re-fetching in modal handler)
const categoryNameCache = new Map<string, string>();

// ==========================================
// STEP 1: /ticket → Show combined panel
// ==========================================

export async function handleTicketCommand(
  interaction: ChatInputCommandInteraction,
  tenantId: string
): Promise<void> {
  try {
    const categories = await resolveCategories(tenantId);

    if (!categories || categories.length === 0) {
      await interaction.reply({
        content: 'No ticket categories are configured. Ask the server admin to set up categories.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Cache category names
    for (const cat of categories) {
      categoryNameCache.set(cat.id, cat.name);
    }

    // Initialize user state
    userState.set(interaction.user.id, { category: '', categoryName: '', severity: '' });

    // Row 1: Category dropdown
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`ticket_category:${tenantId}`)
        .setPlaceholder('Select a category...')
        .addOptions(
          categories.slice(0, 25).map((cat) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(cat.name)
              .setValue(cat.id)
          )
        )
    );

    // Row 2: Severity buttons
    const severityRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:low`)
        .setLabel('Low')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🟢'),
      new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:medium`)
        .setLabel('Medium')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🟡'),
      new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:high`)
        .setLabel('High')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🟠'),
      new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:critical`)
        .setLabel('Critical')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔴'),
    );

    // Row 3: Next button (disabled until both selected)
    const nextRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_next:${tenantId}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
    );

    await interaction.reply({
      content: '**Create a Support Ticket**\n\nSelect a category and severity, then click **Next**.',
      components: [selectRow, severityRow, nextRow],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    console.error('[TicketCommand] Error showing panel:', error);
    await interaction.reply({
      content: 'An error occurred. Please try again later.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

// ==========================================
// Category selected → Update panel
// ==========================================

export async function handleTicketCategorySelect(
  interaction: StringSelectMenuInteraction,
  tenantId: string
): Promise<void> {
  try {
    const categoryId = interaction.values[0];
    const categoryName = categoryNameCache.get(categoryId) || categoryId;

    // Update user state
    const state = userState.get(interaction.user.id) || { category: '', categoryName: '', severity: '' };
    state.category = categoryId;
    state.categoryName = categoryName;
    userState.set(interaction.user.id, state);

    await rebuildPanel(interaction, tenantId, state);
  } catch (error) {
    console.error('[TicketCommand] Error handling category select:', error);
  }
}

// ==========================================
// Severity selected → Update panel
// ==========================================

export async function handleTicketSeverityButton(
  interaction: ButtonInteraction
): Promise<void> {
  try {
    const parts = interaction.customId.split(':');
    if (parts.length !== 3) return;

    const [, tenantId, severity] = parts;

    // Update user state
    const state = userState.get(interaction.user.id) || { category: '', categoryName: '', severity: '' };
    state.severity = severity;
    userState.set(interaction.user.id, state);

    await rebuildPanel(interaction, tenantId, state);
  } catch (error) {
    console.error('[TicketCommand] Error handling severity:', error);
  }
}

// ==========================================
// Rebuild the panel with current selections
// ==========================================

async function rebuildPanel(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  tenantId: string,
  state: { category: string; categoryName: string; severity: string }
): Promise<void> {
  const bothSelected = state.category !== '' && state.severity !== '';

  // Build status line
  const lines = ['**Create a Support Ticket**\n'];
  if (state.categoryName) {
    lines.push(`**Category:** ${state.categoryName}`);
  }
  if (state.severity) {
    lines.push(`**Severity:** ${state.severity.charAt(0).toUpperCase() + state.severity.slice(1)}`);
  }
  if (!bothSelected) {
    lines.push('\nSelect a category and severity, then click **Next**.');
  } else {
    lines.push('\nClick **Next** to describe your issue.');
  }

  // Row 1: Category dropdown (re-fetch to rebuild)
  const categories = await resolveCategories(tenantId);
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ticket_category:${tenantId}`)
      .setPlaceholder('Select a category...')
      .addOptions(
        categories.slice(0, 25).map((cat) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat.name)
            .setValue(cat.id)
            .setDefault(cat.id === state.category)
        )
      )
  );

  // Row 2: Severity buttons — highlight selected
  const severityRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...(['low', 'medium', 'high', 'critical'] as const).map((sev) => {
      const emojis: Record<string, string> = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
      const selected = state.severity === sev;
      return new ButtonBuilder()
        .setCustomId(`ticket_severity:${tenantId}:${sev}`)
        .setLabel(sev.charAt(0).toUpperCase() + sev.slice(1))
        .setStyle(selected ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setEmoji(emojis[sev]);
    })
  );

  // Row 3: Next button
  const nextRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_next:${tenantId}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!bothSelected),
  );

  await interaction.update({
    content: lines.join('\n'),
    components: [selectRow, severityRow, nextRow],
  });
}

// ==========================================
// Next button → Open modal
// ==========================================

export async function handleTicketNextButton(
  interaction: ButtonInteraction
): Promise<void> {
  try {
    const parts = interaction.customId.split(':');
    if (parts.length !== 2) return;

    const [, tenantId] = parts;
    const state = userState.get(interaction.user.id);

    if (!state || !state.category || !state.severity) {
      await interaction.reply({
        content: 'Please select both a category and severity first.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal:${tenantId}:${state.category}:${state.severity}`)
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

    // showModal MUST be the first response
    await interaction.showModal(modal);
  } catch (error) {
    console.error('[TicketCommand] Error showing modal:', error);
  }
}

// ==========================================
// Modal submitted → Create ticket
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

    const provider = await resolveProvider(tenantId);
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

    // Clean up user state
    userState.delete(interaction.user.id);

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

    // Auto-dismiss after 15 seconds
    setTimeout(async () => {
      try {
        await interaction.deleteReply();
      } catch {
        // Already dismissed or expired
      }
    }, 15_000);
  } catch (error) {
    console.error('[TicketCommand] Error creating ticket:', error);
    await interaction.editReply({
      content: 'An error occurred while creating your ticket. Please try again later.',
    });
  }
}
