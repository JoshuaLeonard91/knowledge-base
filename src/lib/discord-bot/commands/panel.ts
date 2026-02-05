/**
 * Persistent Ticket Panel
 *
 * A non-ephemeral V2 container posted in the ticket channel after /setup.
 * Shows description + "Create Ticket" button. Clicking the button opens
 * a modal with category, severity, title, description, and file upload.
 *
 * Custom IDs:
 *   panel_create:{botId}       → create ticket button → shows modal
 *   panel_modal:{botId}        → modal submit
 */

import {
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  FileUploadBuilder,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import type { FileUploadModalData } from 'discord.js';
import { getTicketProvider, getTicketProviderForTenant } from '@/lib/ticketing/adapter';
import { getTicketCategories, getTicketCategoriesForTenant } from '@/lib/cms';
import { MAIN_DOMAIN_BOT_ID } from '../constants';
import { botManager } from '../manager';
import { sendTicketCreationDM } from '../notifications';
import { logTicketCreated } from '../log';
import { getBotSetup, resolveTenantSlug } from '../helpers';
import { prisma } from '@/lib/db/client';

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

// Category name cache
const categoryNameCache = new Map<string, string>();

// ==========================================
// PANEL CONFIG
// ==========================================

const BLURPLE = 0x5865f2;

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

export interface PanelConfig {
  title: string;
  description: string;
  buttonLabel: string;
  infoLines: string[];
}

const DEFAULT_PANEL_CONFIG: PanelConfig = {
  title: 'Support Tickets',
  description: 'Click **Create Ticket** to open a support request.',
  buttonLabel: 'Create Ticket',
  infoLines: [],
};

export async function getPanelConfig(botId: string): Promise<PanelConfig> {
  const setup = await getBotSetup(botId);
  if (!setup) return DEFAULT_PANEL_CONFIG;

  let infoLines: string[] = [];
  if (setup.panelInfoLines) {
    try {
      infoLines = JSON.parse(setup.panelInfoLines);
    } catch {
      infoLines = [];
    }
  }

  return {
    title: setup.panelTitle || DEFAULT_PANEL_CONFIG.title,
    description: setup.panelDescription || DEFAULT_PANEL_CONFIG.description,
    buttonLabel: setup.panelButtonLabel || DEFAULT_PANEL_CONFIG.buttonLabel,
    infoLines,
  };
}

// ==========================================
// POST PERSISTENT PANEL
// ==========================================

/**
 * Post the persistent ticket panel in a channel.
 * Returns the message ID for storage in DiscordBotSetup.
 */
export async function postPersistentPanel(
  botId: string,
  channelId: string,
  config?: PanelConfig
): Promise<string> {
  const client = botManager.getBot(botId);
  if (!client) throw new Error('Bot not available');

  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error('Channel not found or not a text channel');
  }

  const panelConfig = config || await getPanelConfig(botId);

  // Pre-cache category names for modal handler
  const categories = await resolveCategories(botId);
  for (const cat of categories) {
    categoryNameCache.set(cat.id, cat.name);
  }

  // Create ticket button
  const createButton = new ButtonBuilder()
    .setCustomId(`panel_create:${botId}`)
    .setLabel(panelConfig.buttonLabel)
    .setStyle(ButtonStyle.Success);

  // Build container — simplified, no dropdowns
  const container = new ContainerBuilder()
    .setAccentColor(BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${panelConfig.title}`)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(panelConfig.description)
    );

  // Info lines (optional)
  if (panelConfig.infoLines.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    const infoText = panelConfig.infoLines.map(line => `-# ${line}`).join('\n');
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(infoText)
    );
  }

  container
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

/**
 * Re-post the panel: delete old message, post new one, update DB.
 */
export async function refreshPanel(botId: string): Promise<string | null> {
  const setup = await getBotSetup(botId);
  if (!setup?.ticketChannelId) return null;

  const client = botManager.getBot(botId);
  if (!client) return null;

  // Delete old panel message (best-effort)
  if (setup.ticketPanelMessageId) {
    try {
      const channel = await client.channels.fetch(setup.ticketChannelId);
      if (channel?.isTextBased()) {
        const oldMsg = await (channel as TextChannel).messages.fetch(setup.ticketPanelMessageId);
        await oldMsg.delete();
      }
    } catch {
      // Already deleted or inaccessible
    }
  }

  const config = await getPanelConfig(botId);
  const newMessageId = await postPersistentPanel(botId, setup.ticketChannelId, config);

  // Update DB
  await prisma.discordBotSetup.update({
    where: { id: botId },
    data: { ticketPanelMessageId: newMessageId },
  });

  return newMessageId;
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

    const categories = await resolveCategories(botId);
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

    const modal = buildPanelModal(botId, categories);
    await interaction.showModal(modal);
  } catch (error) {
    console.error('[Panel] Error showing modal:', error);
  }
}

function buildPanelModal(
  botId: string,
  categories: Array<{ id: string; name: string }>
): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`panel_modal:${botId}`)
    .setTitle('Create a Support Ticket');

  // 1. Category select
  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId('ticket_category')
    .setPlaceholder('Select a category...')
    .addOptions(
      categories.slice(0, 25).map((cat) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(cat.name)
          .setValue(cat.id)
      )
    );

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel('Category')
      .setStringSelectMenuComponent(categorySelect)
  );

  // 2. Severity select
  const severitySelect = new StringSelectMenuBuilder()
    .setCustomId('ticket_severity')
    .setPlaceholder('Select severity...')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Low').setValue('low').setEmoji('\u{1F7E2}'),
      new StringSelectMenuOptionBuilder().setLabel('Medium').setValue('medium').setEmoji('\u{1F7E1}'),
      new StringSelectMenuOptionBuilder().setLabel('High').setValue('high').setEmoji('\u{1F7E0}'),
      new StringSelectMenuOptionBuilder().setLabel('Critical').setValue('critical').setEmoji('\u{1F534}'),
    );

  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel('Severity')
      .setStringSelectMenuComponent(severitySelect)
  );

  // 3. Title
  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel('Title')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('ticket_title')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Brief summary of the issue')
          .setMinLength(5)
          .setMaxLength(100)
          .setRequired(true)
      )
  );

  // 4. Description
  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel('Description')
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId('ticket_description')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Provide details about the issue...')
          .setMinLength(10)
          .setMaxLength(4000)
          .setRequired(true)
      )
  );

  // 5. File upload
  modal.addLabelComponents(
    new LabelBuilder()
      .setLabel('Attachments')
      .setDescription('Screenshots or files (optional)')
      .setFileUploadComponent(
        new FileUploadBuilder()
          .setCustomId('ticket_files')
          .setRequired(false)
          .setMaxValues(5)
      )
  );

  return modal;
}

// ==========================================
// MODAL SUBMIT → CREATE TICKET
// ==========================================

export async function handlePanelModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length !== 2) return;

  const [, botId] = parts;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Extract fields from modal
    const categoryId = interaction.fields.getStringSelectValues('ticket_category')[0];
    const severity = interaction.fields.getStringSelectValues('ticket_severity')[0];
    const title = interaction.fields.getTextInputValue('ticket_title');
    const description = interaction.fields.getTextInputValue('ticket_description');

    if (!categoryId || !severity) {
      await interaction.editReply({
        content: 'Please select both a category and severity.',
      });
      return;
    }

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
      console.error('[Panel] Ticket creation failed:', result.error);
      await interaction.editReply({
        content: 'Failed to create ticket. Please try again later.',
      });
      return;
    }

    // Upload attachments
    let fileField: FileUploadModalData | null = null;
    try {
      fileField = interaction.fields.getField('ticket_files', ComponentType.FileUpload) as FileUploadModalData;
    } catch {
      // No files uploaded
    }

    if (fileField?.attachments?.size && provider.addAttachment) {
      const ticketId = result.ticketId!;
      for (const [, attachment] of fileField.attachments) {
        try {
          const response = await fetch(attachment.url);
          const buffer = Buffer.from(await response.arrayBuffer());
          await provider.addAttachment(ticketId, buffer, attachment.name, attachment.contentType || 'application/octet-stream');
        } catch (err) {
          console.error('[Panel] Failed to upload attachment:', attachment.name, err);
        }
      }
    }

    // Build confirmation
    const accentColor = severityAccentColors[severity] || BLURPLE;

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
        new TextDisplayBuilder().setContent(
          "-# You'll receive updates in your DMs."
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
      severity,
      description,
      discordUserId: interaction.user.id,
    }).catch(err => console.error('[Panel] DM failed:', err));

    // Collect attachment info for the log
    const attachmentInfos = fileField?.attachments
      ? Array.from(fileField.attachments.values()).map(a => ({
          name: a.name,
          url: a.url,
          size: a.size,
          contentType: a.contentType || undefined,
        }))
      : [];

    const portalUrl = `https://${slug}.helpportal.app/support/tickets/${result.ticketId}`;

    logTicketCreated({
      botId,
      ticketId: result.ticketId!,
      summary,
      description,
      category: categoryName,
      severity,
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 64 }),
      attachments: attachmentInfos,
      portalUrl,
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
