/**
 * /ticket Command — Unified Modal with Components V2
 *
 * Shows a single modal with category select, severity select,
 * title, description, and file upload. No multi-step flow.
 *
 * Flow:
 * 1. /ticket → Modal with all fields (category, severity, title, description, files)
 * 2. Submit modal → Create ticket → Upload attachments → Confirmation → Auto-dismiss
 *
 * Custom ID: ticket_modal:{tenantId}
 */

import {
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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
import { sendTicketCreationDM } from '../notifications';
import { logTicketCreated } from '../log';
import { resolveTenantSlug } from '../helpers';

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

// Category name cache (avoid re-fetching in modal handler) — TTL-based eviction
const categoryNameCache = new Map<string, { value: string; expiresAt: number }>();
const CATEGORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function setCategoryCache(id: string, name: string) {
  // Evict expired entries when cache exceeds 500
  if (categoryNameCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of categoryNameCache) {
      if (v.expiresAt < now) categoryNameCache.delete(k);
    }
  }
  categoryNameCache.set(id, { value: name, expiresAt: Date.now() + CATEGORY_CACHE_TTL });
}

function getCategoryName(id: string): string | undefined {
  const entry = categoryNameCache.get(id);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    categoryNameCache.delete(id);
    return undefined;
  }
  return entry.value;
}

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
// BUILD TICKET MODAL
// ==========================================

function buildTicketModal(
  tenantId: string,
  categories: Array<{ id: string; name: string }>
): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal:${tenantId}`)
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
// /ticket → Show modal directly
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
      setCategoryCache(cat.id, cat.name);
    }

    const modal = buildTicketModal(tenantId, categories);
    await interaction.showModal(modal);
  } catch (error) {
    console.error('[TicketCommand] Error showing modal:', error);
    await interaction.reply({
      content: 'An error occurred. Please try again later.',
      flags: MessageFlags.Ephemeral,
    });
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
  if (parts.length !== 2) return;

  const [, tenantId] = parts;

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

    const provider = await resolveProvider(tenantId);
    if (!provider) {
      await interaction.editReply({
        content: 'Ticketing is not configured for this server. Ask the server admin to set up a ticket provider.',
      });
      return;
    }

    const categoryName = getCategoryName(categoryId) || categoryId;
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
      console.error('[Ticket] Ticket creation failed:', result.error);
      await interaction.editReply({
        content: 'Failed to create ticket. Please try again later or use the support portal.',
      });
      return;
    }

    // Upload attachments (fire-and-forget)
    let fileField: FileUploadModalData | null = null;
    try {
      fileField = interaction.fields.getField('ticket_files', ComponentType.FileUpload) as FileUploadModalData;
    } catch {
      // No files uploaded
    }

    if (fileField?.attachments?.size && provider.addAttachment) {
      const ticketId = result.ticketId!;
      await Promise.all(
        Array.from(fileField.attachments.values()).map(async (attachment) => {
          try {
            const response = await fetch(attachment.url);
            const buffer = Buffer.from(await response.arrayBuffer());
            await provider.addAttachment!(ticketId, buffer, attachment.name, attachment.contentType || 'application/octet-stream');
          } catch (err) {
            console.error('[TicketCommand] Failed to upload attachment:', attachment.name, err);
          }
        })
      );
    }

    // Build confirmation container
    const accentColor = severityAccentColors[severity] || BLURPLE;

    const container = new ContainerBuilder()
      .setAccentColor(accentColor)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Ticket Created')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${result.ticketId}**\n${title}`
        )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Category:** ${categoryName}\n` +
          `**Severity:** ${severityEmojis[severity] || ''} ${severityLabel}\n` +
          `**Status:** \u{1F7E2} Open`
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
    const slug = await resolveTenantSlug(tenantId);
    sendTicketCreationDM({
      botId: tenantId,
      tenantSlug: slug,
      ticketId: result.ticketId!,
      severity,
      description,
      discordUserId: interaction.user.id,
    }).catch(err => console.error('[TicketCommand] DM failed:', err));

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
      botId: tenantId,
      ticketId: result.ticketId!,
      summary,
      description,
      category: categoryName,
      severity,
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.username,
      avatarUrl: interaction.user.displayAvatarURL({ size: 64 }),
      guildName: interaction.guild?.name,
      guildId: interaction.guildId || undefined,
      attachments: attachmentInfos,
      portalUrl,
    }).catch(err => console.error('[TicketCommand] Log failed:', err));

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
