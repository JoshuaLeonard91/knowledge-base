/**
 * /setup Command — Owner-Only Server Configuration Wizard
 *
 * 3-step ephemeral wizard:
 * 1. Select ticket channel (where persistent panel is posted)
 * 2. Select log channel (optional, for admin ticket activity)
 * 3. Notification preferences (DM on create, DM on update)
 *
 * On confirm: upserts DiscordBotSetup, posts persistent panel.
 */

import {
  type ChatInputCommandInteraction,
  type ChannelSelectMenuInteraction,
  type ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { prisma } from '@/lib/db/client';
import { postPersistentPanel } from './panel';

// ==========================================
// WIZARD STATE
// ==========================================

interface SetupWizardState {
  step: 1 | 2 | 3;
  ticketChannelId?: string;
  logChannelId?: string;
  dmOnCreate: boolean;
  dmOnUpdate: boolean;
}

const wizardState = new Map<string, SetupWizardState>();

function stateKey(botId: string, userId: string): string {
  return `${botId}:${userId}`;
}

// Auto-clean stale wizard state after 10 minutes
function trackWizardTimeout(key: string): void {
  setTimeout(() => wizardState.delete(key), 10 * 60 * 1000);
}

// ==========================================
// ACCENT COLORS
// ==========================================

const BLURPLE = 0x5865f2;
const GREEN = 0x57f287;

// ==========================================
// STEP BUILDERS
// ==========================================

function buildStep1Container(botId: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# Server Setup (1/3)')
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Select the channel where the ticket creation panel will be posted.'
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addActionRowComponents(
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(`setup_ticketch:${botId}`)
          .setPlaceholder('Select a text channel...')
          .setChannelTypes(ChannelType.GuildText)
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Use /setup again to change this later.')
    );
}

function buildStep2Container(botId: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# Server Setup (2/3)')
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Select a log channel for ticket activity (optional).\nAdmins will see ticket creates and comments here.'
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addActionRowComponents(
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(`setup_logch:${botId}`)
          .setPlaceholder('Select a text channel...')
          .setChannelTypes(ChannelType.GuildText)
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`setup_skiplog:${botId}`)
          .setLabel('Skip')
          .setStyle(ButtonStyle.Secondary)
      )
    );
}

function buildStep3Container(
  botId: string,
  state: SetupWizardState
): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# Server Setup (3/3)')
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**DM on ticket create:** ${state.dmOnCreate ? 'On' : 'Off'}\n` +
        `**DM on ticket update:** ${state.dmOnUpdate ? 'On' : 'Off'}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`setup_dmcreate:${botId}`)
          .setLabel(`DM on Create: ${state.dmOnCreate ? 'On' : 'Off'}`)
          .setStyle(state.dmOnCreate ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`setup_dmupdate:${botId}`)
          .setLabel(`DM on Update: ${state.dmOnUpdate ? 'On' : 'Off'}`)
          .setStyle(state.dmOnUpdate ? ButtonStyle.Primary : ButtonStyle.Secondary)
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`setup_confirm:${botId}`)
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success)
      )
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '-# These control whether the bot DMs ticket creators.'
      )
    );
}

function buildConfirmationContainer(
  ticketChannelId: string,
  logChannelId: string | null,
  dmOnCreate: boolean,
  dmOnUpdate: boolean
): ContainerBuilder {
  const logLine = logChannelId ? `<#${logChannelId}>` : 'None';
  return new ContainerBuilder()
    .setAccentColor(GREEN)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# Setup Complete')
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Ticket panel:** <#${ticketChannelId}>\n` +
        `**Log channel:** ${logLine}\n` +
        `**DM on create:** ${dmOnCreate ? 'On' : 'Off'} \u00b7 ` +
        `**DM on update:** ${dmOnUpdate ? 'On' : 'Off'}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Run /setup again to reconfigure.')
    );
}

// ==========================================
// HANDLERS
// ==========================================

export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
  botId: string
): Promise<void> {
  try {
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
        content: 'Only the server owner can run this command.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const key = stateKey(botId, interaction.user.id);
    wizardState.set(key, {
      step: 1,
      dmOnCreate: true,
      dmOnUpdate: true,
    });
    trackWizardTimeout(key);

    await interaction.reply({
      components: [buildStep1Container(botId)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error('[Setup] Error starting wizard:', error);
    await interaction.reply({
      content: 'An error occurred. Please try again.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function handleSetupTicketChannelSelect(
  interaction: ChannelSelectMenuInteraction,
  botId: string
): Promise<void> {
  try {
    const key = stateKey(botId, interaction.user.id);
    const state = wizardState.get(key);
    if (!state) {
      await interaction.reply({
        content: 'Setup session expired. Run /setup again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    state.ticketChannelId = interaction.values[0];
    state.step = 2;

    await interaction.update({
      components: [buildStep2Container(botId)],
    });
  } catch (error) {
    console.error('[Setup] Error handling ticket channel select:', error);
  }
}

export async function handleSetupLogChannelSelect(
  interaction: ChannelSelectMenuInteraction,
  botId: string
): Promise<void> {
  try {
    const key = stateKey(botId, interaction.user.id);
    const state = wizardState.get(key);
    if (!state) {
      await interaction.reply({
        content: 'Setup session expired. Run /setup again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    state.logChannelId = interaction.values[0];
    state.step = 3;

    await interaction.update({
      components: [buildStep3Container(botId, state)],
    });
  } catch (error) {
    console.error('[Setup] Error handling log channel select:', error);
  }
}

export async function handleSetupSkipLogButton(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  try {
    const key = stateKey(botId, interaction.user.id);
    const state = wizardState.get(key);
    if (!state) {
      await interaction.reply({
        content: 'Setup session expired. Run /setup again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    state.logChannelId = undefined;
    state.step = 3;

    await interaction.update({
      components: [buildStep3Container(botId, state)],
    });
  } catch (error) {
    console.error('[Setup] Error handling skip log:', error);
  }
}

export async function handleSetupDmToggle(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  try {
    const key = stateKey(botId, interaction.user.id);
    const state = wizardState.get(key);
    if (!state) {
      await interaction.reply({
        content: 'Setup session expired. Run /setup again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Toggle based on which button was clicked
    if (interaction.customId.startsWith('setup_dmcreate:')) {
      state.dmOnCreate = !state.dmOnCreate;
    } else if (interaction.customId.startsWith('setup_dmupdate:')) {
      state.dmOnUpdate = !state.dmOnUpdate;
    }

    await interaction.update({
      components: [buildStep3Container(botId, state)],
    });
  } catch (error) {
    console.error('[Setup] Error handling DM toggle:', error);
  }
}

export async function handleSetupConfirmButton(
  interaction: ButtonInteraction,
  botId: string
): Promise<void> {
  try {
    const key = stateKey(botId, interaction.user.id);
    const state = wizardState.get(key);
    if (!state || !state.ticketChannelId) {
      await interaction.reply({
        content: 'Setup session expired. Run /setup again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Defer while we do DB + API calls
    await interaction.deferUpdate();

    const guildId = interaction.guildId!;

    // Delete old panel message if exists
    const existing = await prisma.discordBotSetup.findUnique({
      where: { id: botId },
    });

    if (existing?.ticketPanelMessageId && existing?.ticketChannelId) {
      try {
        const guild = interaction.guild!;
        const oldChannel = await guild.channels.fetch(existing.ticketChannelId);
        if (oldChannel?.isTextBased()) {
          const oldMsg = await oldChannel.messages.fetch(existing.ticketPanelMessageId);
          await oldMsg.delete();
        }
      } catch {
        // Old message already deleted or channel changed
      }
    }

    // Post persistent panel in the new channel
    let panelMessageId: string | null = null;
    try {
      panelMessageId = await postPersistentPanel(botId, state.ticketChannelId);
    } catch (error) {
      console.error('[Setup] Failed to post panel:', error);
      await interaction.editReply({
        content: 'Failed to post the ticket panel. Check the bot has permissions to send messages in that channel.',
      });
      wizardState.delete(key);
      return;
    }

    // Upsert DB config
    await prisma.discordBotSetup.upsert({
      where: { id: botId },
      create: {
        id: botId,
        guildId,
        ticketChannelId: state.ticketChannelId,
        logChannelId: state.logChannelId || null,
        ticketPanelMessageId: panelMessageId,
        dmOnCreate: state.dmOnCreate,
        dmOnUpdate: state.dmOnUpdate,
      },
      update: {
        guildId,
        ticketChannelId: state.ticketChannelId,
        logChannelId: state.logChannelId || null,
        ticketPanelMessageId: panelMessageId,
        dmOnCreate: state.dmOnCreate,
        dmOnUpdate: state.dmOnUpdate,
      },
    });

    // Clean up wizard state
    wizardState.delete(key);

    // Show confirmation
    await interaction.editReply({
      components: [
        buildConfirmationContainer(
          state.ticketChannelId,
          state.logChannelId || null,
          state.dmOnCreate,
          state.dmOnUpdate
        ),
      ],
    });
  } catch (error) {
    console.error('[Setup] Error confirming setup:', error);
    const key = stateKey(botId, interaction.user.id);
    wizardState.delete(key);
  }
}
