/**
 * Persistent Ticket Panel
 *
 * A non-ephemeral V2 container posted in the ticket channel after /setup.
 * Shows category dropdown + severity buttons + "Create Ticket" button.
 *
 * The message is shared by all users. Interactions are tracked per-user
 * in memory (panelUserState). The persistent message itself never changes.
 *
 * Custom IDs:
 *   panel_category:{botId}                      → select menu
 *   panel_severity:{botId}:{severity}           → severity buttons
 *   panel_create:{botId}                        → create ticket button
 *   panel_modal:{botId}:{categoryId}:{severity} → modal submit
 */

import {
  type StringSelectMenuInteraction,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
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
import { botManager } from '../manager';
import { sendTicketCreationDM } from '../notifications';
import { logTicketCreated } from '../log';
import { resolveTenantSlug } from '../helpers';

// ==========================================
// HELPERS
// ==========================================

function isMainDomain(botId: string): boolean {
  return botId === MAIN_DOMAIN_BOT_ID;
}

async function resolveCategories(botId: string) {
  return isMainDomain(botId)
    ? getTicketCategories()
    : getTicketCategoriesForTenant(botId);
}

async function resolveProvider(botId: string) {
  if (isMainDomain(botId)) {
    const provider = getTicketProvider();
    return provider.isAvailable() ? provider : null;
  }
  return getTicketProviderForTenant(botId);
}

// ==========================================
// USER STATE
// ==========================================

interface PanelUserState {
  category: string;
  categoryName: string;
  severity: string;
  createdAt: number;
}

const panelUserState = new Map<string, PanelUserState>();

function panelKey(botId: string, userId: string): string {
  return `${botId}:${userId}`;
}

// Clean stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of panelUserState) {
    if (now - state.createdAt > 15 * 60 * 1000) {
      panelUserState.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Category name cache
const categoryNameCache = new Map<string, string>();

// ==========================================
// ACCENT COLORS & EMOJIS
// ==========================================

const BLURPLE = 0x5865f2;

const severityEmojis: Record<string, string> = {
  low: '\u{1F7E2}',
  medium: '\u{1F7E1}',
  high: '\u{1F7E0}',
  critical: '\u{1F534}',
};

const severityAccentColors: Record<string, number> = {
  low: 0x57f287,
  medium: 0xfee75c,
  high: 0xe67e22,
  critical: 0xed4245,
};

const severityToPriority: Record<string, 'lowest' | 'low' | 'medium' | 'high' | 'highest'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'highest',
};

// ==========================================
// POST PERSISTENT PANEL
// ==========================================

/**
 * Post the persistent ticket panel in a channel.
 * Returns the message ID for storage in DiscordBotSetup.
 */
export async function postPersistentPanel(
  botId: string,
  channelId: string
): Promise<string> {
  const client = botManager.getBot(botId);
  if (!client) throw new Error('Bot not available');

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error('Channel not found or not a text channel');
  }

  const categories = await resolveCategories(botId);

  // Cache category names
  for (const cat of categories) {
    categoryNameCache.set(cat.id, cat.name);
  }

  // Build the persistent panel
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`panel_category:${botId}`)
    .setPlaceholder('Select a category...')
    .addOptions(
      categories.slice(0, 25).map((cat) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.name)
          .setValue(cat.id)
      )
    );

  const severityButtons = (['low', 'medium', 'high', 'critical'] as const).map((sev) =>
    new ButtonBuilder()
      .setCustomId(`panel_severity:${botId}:${sev}`)
      .setLabel(sev.charAt(0).toUpperCase() + sev.slice(1))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(severityEmojis[sev])
  );

  const createButton = new ButtonBuilder()
    .setCustomId(`panel_create:${botId}`)
    .setLabel('Create Ticket')
    .setStyle(ButtonStyle.Success);

  const container = new ContainerBuilder()
    .setAccentColor(BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# Support Tickets')
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Select a category and severity, then click **Create Ticket**.'
      )
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
      new ActionRowBuilder<ButtonBuilder>().addComponents(createButton)
    );

  const msg = await (channel as TextChannel).send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });

  return msg.id;
}

// ==========================================
// CATEGORY SELECT
// ==========================================

export async function handlePanelCategorySelect(
  interaction: StringSelectMenuInteraction,
  botId: string
): Promise<void> {
  try {
    const categoryId = interaction.values[0];
    const categoryName = categoryNameCache.get(categoryId) || categoryId;

    const key = panelKey(botId, interaction.user.id);
    const existing = panelUserState.get(key);
    panelUserState.set(key, {
      category: categoryId,
      categoryName,
      severity: existing?.severity || '',
      createdAt: existing?.createdAt || Date.now(),
    });

    // Don't update the persistent message — just acknowledge silently
    await interaction.deferUpdate();
  } catch (error) {
    console.error('[Panel] Error handling category select:', error);
  }
}

// ==========================================
// SEVERITY BUTTON
// ==========================================

export async function handlePanelSeverityButton(
  interaction: ButtonInteraction
): Promise<void> {
  try {
    const parts = interaction.customId.split(':');
    if (parts.length !== 3) return;

    const [, botId, severity] = parts;

    const key = panelKey(botId, interaction.user.id);
    const existing = panelUserState.get(key);
    panelUserState.set(key, {
      category: existing?.category || '',
      categoryName: existing?.categoryName || '',
      severity,
      createdAt: existing?.createdAt || Date.now(),
    });

    await interaction.deferUpdate();
  } catch (error) {
    console.error('[Panel] Error handling severity button:', error);
  }
}

// ==========================================
// CREATE TICKET BUTTON → MODAL
// ==========================================

export async function handlePanelCreateButton(
  interaction: ButtonInteraction
): Promise<void> {
  try {
    const parts = interaction.customId.split(':');
    if (parts.length !== 2) return;

    const [, botId] = parts;
    const key = panelKey(botId, interaction.user.id);
    const state = panelUserState.get(key);

    if (!state || !state.category || !state.severity) {
      await interaction.reply({
        content: 'Please select a category and severity first, then click **Create Ticket**.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`panel_modal:${botId}:${state.category}:${state.severity}`)
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
    console.error('[Panel] Error showing modal:', error);
  }
}

// ==========================================
// MODAL SUBMIT → CREATE TICKET
// ==========================================

export async function handlePanelModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length !== 4) return;

  const [, botId, categoryId, severity] = parts;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const title = interaction.fields.getTextInputValue('ticket_title');
    const description = interaction.fields.getTextInputValue('ticket_description');

    const provider = await resolveProvider(botId);
    if (!provider) {
      await interaction.editReply({
        content: 'Ticketing is not configured for this server.',
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
        content: 'Failed to create ticket. Please try again later.',
      });
      return;
    }

    // Clean up user state
    const key = panelKey(botId, interaction.user.id);
    panelUserState.delete(key);

    // Build confirmation
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

    // Fire-and-forget: DM + log
    const slug = await resolveTenantSlug(botId);
    sendTicketCreationDM({
      botId,
      tenantSlug: slug,
      ticketId: result.ticketId!,
      category: categoryName,
      severity,
      status: 'Open',
      title,
      description,
      discordUserId: interaction.user.id,
    }).catch(err => console.error('[Panel] DM failed:', err));

    logTicketCreated({
      botId,
      ticketId: result.ticketId!,
      summary,
      category: categoryName,
      severity,
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.username,
    }).catch(err => console.error('[Panel] Log failed:', err));

    // Auto-dismiss after 15 seconds
    setTimeout(async () => {
      try {
        await interaction.deleteReply();
      } catch {
        // Already dismissed
      }
    }, 15_000);
  } catch (error) {
    console.error('[Panel] Error creating ticket:', error);
    await interaction.editReply({
      content: 'An error occurred while creating your ticket.',
    });
  }
}
