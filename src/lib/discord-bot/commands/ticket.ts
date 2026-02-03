/**
 * /ticket Command — Components V2 Interactive Flow
 *
 * Uses Discord's Components V2 system (ContainerBuilder, TextDisplayBuilder,
 * SeparatorBuilder) for a polished card-style UI with accent colors and
 * markdown headers.
 *
 * Flow:
 * 1. /ticket → Container panel: category dropdown + severity buttons + Next
 * 2. Click Next → Modal with Title + Description
 * 3. Submit modal → Create ticket → Confirmation container → Auto-dismiss
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
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
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

// Accent colors by severity
const BLURPLE = 0x5865f2;
const severityAccentColors: Record<string, number> = {
  low: 0x57f287,      // green
  medium: 0xfee75c,   // yellow
  high: 0xe67e22,     // orange
  critical: 0xed4245, // red
};

const severityEmojis: Record<string, string> = {
  low: '\u{1F7E2}',
  medium: '\u{1F7E1}',
  high: '\u{1F7E0}',
  critical: '\u{1F534}',
};

// ==========================================
// BUILD PANEL CONTAINER
// ==========================================

function buildTicketPanel(
  tenantId: string,
  categories: Array<{ id: string; name: string }>,
  state: { category: string; categoryName: string; severity: string }
): ContainerBuilder {
  const bothSelected = state.category !== '' && state.severity !== '';
  const accentColor = state.severity ? (severityAccentColors[state.severity] || BLURPLE) : BLURPLE;

  // Status text
  const statusParts: string[] = [];
  if (state.categoryName) {
    statusParts.push(`**Category:** ${state.categoryName}`);
  }
  if (state.severity) {
    const label = state.severity.charAt(0).toUpperCase() + state.severity.slice(1);
    statusParts.push(`**Severity:** ${label}`);
  }

  const hint = bothSelected
    ? 'Click **Next** to describe your issue.'
    : 'Select a category and severity, then click **Next**.';

  // Category dropdown
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`ticket_category:${tenantId}`)
    .setPlaceholder('Select a category...')
    .addOptions(
      categories.slice(0, 25).map((cat) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.name)
          .setValue(cat.id)
          .setDefault(cat.id === state.category)
      )
    );

  // Severity buttons
  const severityButtons = (['low', 'medium', 'high', 'critical'] as const).map((sev) => {
    const selected = state.severity === sev;
    return new ButtonBuilder()
      .setCustomId(`ticket_severity:${tenantId}:${sev}`)
      .setLabel(sev.charAt(0).toUpperCase() + sev.slice(1))
      .setStyle(selected ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji(severityEmojis[sev]);
  });

  // Next button
  const nextButton = new ButtonBuilder()
    .setCustomId(`ticket_next:${tenantId}`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!bothSelected);

  // Build container
  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# Create a Support Ticket')
    );

  // Show current selections if any
  if (statusParts.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(statusParts.join('\n'))
    );
  }

  container
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${hint}`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(...severityButtons)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(nextButton)
    );

  return container;
}

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
    const state = { category: '', categoryName: '', severity: '' };
    userState.set(interaction.user.id, state);

    const container = buildTicketPanel(tenantId, categories, state);

    await interaction.reply({
      components: [container],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
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

    const categories = await resolveCategories(tenantId);
    const container = buildTicketPanel(tenantId, categories, state);

    await interaction.update({
      components: [container],
    });
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

    const categories = await resolveCategories(tenantId);
    const container = buildTicketPanel(tenantId, categories, state);

    await interaction.update({
      components: [container],
    });
  } catch (error) {
    console.error('[TicketCommand] Error handling severity:', error);
  }
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
    const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

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

    // Build confirmation container
    const accentColor = severityAccentColors[severity] || BLURPLE;
    const truncatedDesc = description.length > 1024
      ? description.substring(0, 1021) + '...'
      : description;

    const container = new ContainerBuilder()
      .setAccentColor(accentColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Ticket Created \u2014 ${result.ticketId}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Category:** ${categoryName}  \u00b7  **Severity:** ${severityLabel}  \u00b7  **Status:** Open`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${title}\n${truncatedDesc}`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# Created by ${interaction.user.username}`
        )
      );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
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
