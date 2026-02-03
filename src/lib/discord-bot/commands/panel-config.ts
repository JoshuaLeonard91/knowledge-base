/**
 * /panel Command — Panel Configuration
 *
 * Owner-only command to customize the persistent ticket panel.
 *
 * Subcommands:
 *   /panel edit    → Opens modal pre-filled with current config
 *   /panel refresh → Re-posts the panel with current config
 *
 * Custom ID:
 *   panel_edit_modal:{botId} → modal submit
 */

import {
  type ChatInputCommandInteraction,
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
import { getBotSetup } from '../helpers';
import { getPanelConfig, refreshPanel } from './panel';

const BLURPLE = 0x5865f2;

// ==========================================
// /panel COMMAND HANDLER
// ==========================================

export async function handlePanelCommand(
  interaction: ChatInputCommandInteraction,
  botId: string
): Promise<void> {
  // Owner-only check
  if (!interaction.guild) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (interaction.guild.ownerId !== interaction.user.id) {
    await interaction.reply({
      content: 'Only the server owner can use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check that setup has been run
  const setup = await getBotSetup(botId);
  if (!setup?.ticketChannelId) {
    await interaction.reply({
      content: 'Please run `/setup` first to configure the ticket channel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'edit') {
    await handleEdit(interaction, botId);
  } else if (subcommand === 'refresh') {
    await handleRefresh(interaction, botId);
  }
}

// ==========================================
// /panel edit → MODAL
// ==========================================

async function handleEdit(
  interaction: ChatInputCommandInteraction,
  botId: string
): Promise<void> {
  const config = await getPanelConfig(botId);

  const modal = new ModalBuilder()
    .setCustomId(`panel_edit_modal:${botId}`)
    .setTitle('Edit Ticket Panel');

  const titleInput = new TextInputBuilder()
    .setCustomId('panel_title')
    .setLabel('Panel Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Support Tickets')
    .setValue(config.title)
    .setMaxLength(100)
    .setRequired(true);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('panel_description')
    .setLabel('Panel Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Select a category and severity, then click Create Ticket.')
    .setValue(config.description)
    .setMaxLength(1000)
    .setRequired(true);

  const buttonInput = new TextInputBuilder()
    .setCustomId('panel_button_label')
    .setLabel('Button Label')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Create Ticket')
    .setValue(config.buttonLabel)
    .setMaxLength(50)
    .setRequired(true);

  const infoInput = new TextInputBuilder()
    .setCustomId('panel_info_lines')
    .setLabel('Info Lines (one per line)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Response Time: < 2 hours\nHours: Mon-Fri 9am-5pm')
    .setValue(config.infoLines.join('\n'))
    .setMaxLength(1000)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(buttonInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(infoInput),
  );

  await interaction.showModal(modal);
}

// ==========================================
// MODAL SUBMIT → SAVE + REFRESH PANEL
// ==========================================

export async function handlePanelEditModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  const parts = interaction.customId.split(':');
  if (parts.length !== 2) return;

  const [, botId] = parts;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const title = interaction.fields.getTextInputValue('panel_title').trim();
    const description = interaction.fields.getTextInputValue('panel_description').trim();
    const buttonLabel = interaction.fields.getTextInputValue('panel_button_label').trim();
    const infoRaw = interaction.fields.getTextInputValue('panel_info_lines');

    // Parse info lines: split by newline, trim, filter empty
    const infoLines = infoRaw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Update DB
    await prisma.discordBotSetup.update({
      where: { id: botId },
      data: {
        panelTitle: title,
        panelDescription: description,
        panelButtonLabel: buttonLabel,
        panelInfoLines: infoLines.length > 0 ? JSON.stringify(infoLines) : null,
      },
    });

    // Refresh the panel
    const newMessageId = await refreshPanel(botId);

    if (!newMessageId) {
      await interaction.editReply({
        content: 'Panel config saved, but failed to re-post the panel. Run `/panel refresh` to try again.',
      });
      return;
    }

    // Confirmation
    const container = new ContainerBuilder()
      .setAccentColor(BLURPLE)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# Panel Updated')
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Title:** ${title}\n**Button:** ${buttonLabel}\n**Info lines:** ${infoLines.length > 0 ? infoLines.length.toString() : 'None'}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# The panel has been re-posted in the ticket channel.')
      );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error('[PanelConfig] Error saving config:', error);
    await interaction.editReply({
      content: 'An error occurred while saving panel config.',
    });
  }
}

// ==========================================
// /panel refresh
// ==========================================

async function handleRefresh(
  interaction: ChatInputCommandInteraction,
  botId: string
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const newMessageId = await refreshPanel(botId);

    if (!newMessageId) {
      await interaction.editReply({
        content: 'Failed to refresh the panel. Make sure the bot has access to the ticket channel.',
      });
      return;
    }

    await interaction.editReply({
      content: 'Panel has been re-posted in the ticket channel.',
    });
  } catch (error) {
    console.error('[PanelConfig] Error refreshing panel:', error);
    await interaction.editReply({
      content: 'An error occurred while refreshing the panel.',
    });
  }
}
