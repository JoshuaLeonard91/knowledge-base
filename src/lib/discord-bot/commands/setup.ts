/**
 * /setup Command — Owner-Only Server Configuration Wizard
 *
 * 4-step ephemeral wizard:
 * 1. Modal: enter ticket channel name + log channel name
 * 2. Role select: pick roles that can access the log channel (or skip)
 * 3. DM preferences: toggle DM on create / DM on update
 * 4. Confirm: bot creates channels with permissions, posts panel
 *
 * Custom IDs:
 *   setup_names_modal:{botId}  — Modal (step 1)
 *   setup_roles:{botId}        — RoleSelectMenu (step 2)
 *   setup_skiproles:{botId}    — Button (step 2)
 *   setup_dmcreate:{botId}     — Button (step 3)
 *   setup_dmupdate:{botId}     — Button (step 3)
 *   setup_confirm:{botId}      — Button (step 3)
 */

import {
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type RoleSelectMenuInteraction,
  type ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  RoleSelectMenuBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { prisma } from '@/lib/db/client';
import { botManager } from '../manager';
import { postPersistentPanel } from './panel';

// ==========================================
// WIZARD STATE
// ==========================================

interface SetupWizardState {
  step: 1 | 2 | 3;
  ticketChannelName: string;
  logChannelName?: string;
  modRoleIds: string[];
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

function buildStep2Container(botId: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# Server Setup (2/3)')
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Select roles that can access the **log channel**.\nThese roles will be able to view ticket activity.'
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large)
    )
    .addActionRowComponents(
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId(`setup_roles:${botId}`)
          .setPlaceholder('Select roles...')
          .setMinValues(1)
          .setMaxValues(25)
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`setup_skiproles:${botId}`)
          .setLabel('Skip (admin only)')
          .setStyle(ButtonStyle.Secondary)
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# The bot and server owner always have access.')
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
        `**Support Category:** Created\n` +
        `**Ticket channel:** <#${ticketChannelId}>\n` +
        `**Log channel:** ${logLine}\n` +
        `**DM on create:** ${dmOnCreate ? 'On' : 'Off'} \u00b7 ` +
        `**DM on update:** ${dmOnUpdate ? 'On' : 'Off'}`
      )
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '-# Support category with channels created. Private ticket channels will be created here when staff assigns tickets. Run /setup again to reconfigure.'
      )
    );
}

// ==========================================
// HANDLERS
// ==========================================

/**
 * Step 1: /setup → Show modal for channel names
 */
export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
  botId: string
): Promise<void> {
  try {
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

    // Show modal immediately (must be first response)
    const modal = new ModalBuilder()
      .setCustomId(`setup_names_modal:${botId}`)
      .setTitle('Server Setup (1/3)');

    const ticketNameInput = new TextInputBuilder()
      .setCustomId('ticket_channel_name')
      .setLabel('Ticket Channel Name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('support-tickets')
      .setValue('support-tickets')
      .setMaxLength(100)
      .setRequired(true);

    const logNameInput = new TextInputBuilder()
      .setCustomId('log_channel_name')
      .setLabel('Log Channel Name (leave empty to skip)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('ticket-logs')
      .setValue('ticket-logs')
      .setMaxLength(100)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(ticketNameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(logNameInput),
    );

    await interaction.showModal(modal);
  } catch (error) {
    console.error('[Setup] Error starting wizard:', error);
    try {
      await interaction.reply({
        content: 'An error occurred. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      // Modal was already shown, can't reply
    }
  }
}

/**
 * Step 1 result: Modal submit → save names, show role select (step 2)
 */
export async function handleSetupNamesModal(
  interaction: ModalSubmitInteraction,
  botId: string
): Promise<void> {
  try {
    const ticketChannelName = interaction.fields
      .getTextInputValue('ticket_channel_name')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'support-tickets';

    const logRaw = interaction.fields
      .getTextInputValue('log_channel_name')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const logChannelName = logRaw || undefined;

    const key = stateKey(botId, interaction.user.id);
    wizardState.set(key, {
      step: 2,
      ticketChannelName,
      logChannelName,
      modRoleIds: [],
      dmOnCreate: true,
      dmOnUpdate: true,
    });
    trackWizardTimeout(key);

    // If no log channel, skip role select → go to step 3
    if (!logChannelName) {
      const state = wizardState.get(key)!;
      state.step = 3;
      await interaction.reply({
        components: [buildStep3Container(botId, state)],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      return;
    }

    await interaction.reply({
      components: [buildStep2Container(botId)],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    console.error('[Setup] Error handling names modal:', error);
    await interaction.reply({
      content: 'An error occurred. Please try /setup again.',
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Step 2: Role select → save roles, show DM preferences (step 3)
 */
export async function handleSetupRoleSelect(
  interaction: RoleSelectMenuInteraction,
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

    state.modRoleIds = interaction.values;
    state.step = 3;

    await interaction.update({
      components: [buildStep3Container(botId, state)],
    });
  } catch (error) {
    console.error('[Setup] Error handling role select:', error);
  }
}

/**
 * Step 2: Skip roles → go to DM preferences (step 3)
 */
export async function handleSetupSkipRolesButton(
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

    state.modRoleIds = [];
    state.step = 3;

    await interaction.update({
      components: [buildStep3Container(botId, state)],
    });
  } catch (error) {
    console.error('[Setup] Error handling skip roles:', error);
  }
}

/**
 * Step 3: DM toggle buttons
 */
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

/**
 * Step 4: Confirm → create category + channels, post panel, save config
 */
export async function handleSetupConfirmButton(
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

    await interaction.deferUpdate();

    const guild = interaction.guild!;
    const client = botManager.getBot(botId);
    if (!client?.user) {
      await interaction.editReply({
        components: [buildErrorContainer('Bot is not ready. Please try again.')],
      });
      wizardState.delete(key);
      return;
    }

    // --- Create Support category ---
    let supportCategory;
    try {
      // Build permission overwrites for the category
      const categoryOverwrites = [
        {
          id: guild.id, // @everyone: hidden by default
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: client.user.id, // bot: full access
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        // Add mod roles if selected
        ...state.modRoleIds.map(roleId => ({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        })),
      ];

      supportCategory = await guild.channels.create({
        name: 'Support',
        type: ChannelType.GuildCategory,
        permissionOverwrites: categoryOverwrites,
      });
    } catch (error) {
      console.error('[Setup] Failed to create Support category:', error);
      await interaction.editReply({
        components: [buildErrorContainer('Failed to create the Support category. Make sure the bot has **Manage Channels** permission.')],
      });
      wizardState.delete(key);
      return;
    }

    // --- Create ticket creation channel (public for viewing, button-only interaction) ---
    let ticketChannel;
    try {
      ticketChannel = await guild.channels.create({
        name: state.ticketChannelName,
        type: ChannelType.GuildText,
        parent: supportCategory.id,
        permissionOverwrites: [
          {
            id: guild.id, // @everyone: can view but not send messages
            allow: [PermissionFlagsBits.ViewChannel],
            deny: [PermissionFlagsBits.SendMessages],
          },
          {
            id: client.user.id, // bot
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
        ],
      });
    } catch (error) {
      console.error('[Setup] Failed to create ticket channel:', error);
      await interaction.editReply({
        components: [buildErrorContainer('Failed to create the ticket channel. Make sure the bot has **Manage Channels** permission.')],
      });
      wizardState.delete(key);
      return;
    }

    // --- Create log channel (staff-only, inherits category permissions) ---
    let logChannel = null;
    if (state.logChannelName) {
      try {
        logChannel = await guild.channels.create({
          name: state.logChannelName,
          type: ChannelType.GuildText,
          parent: supportCategory.id,
          // Inherits category permissions (staff roles can view)
        });
      } catch (error) {
        console.error('[Setup] Failed to create log channel:', error);
        // Non-fatal: continue without log channel
      }
    }

    // --- Delete old panel message if exists ---
    const existing = await prisma.discordBotSetup.findUnique({
      where: { id: botId },
    });

    if (existing?.ticketPanelMessageId && existing?.ticketChannelId) {
      try {
        const oldChannel = await guild.channels.fetch(existing.ticketChannelId);
        if (oldChannel?.isTextBased()) {
          const oldMsg = await oldChannel.messages.fetch(existing.ticketPanelMessageId);
          await oldMsg.delete();
        }
      } catch {
        // Old message already deleted or channel changed
      }
    }

    // --- Post persistent panel ---
    let panelMessageId: string | null = null;
    try {
      panelMessageId = await postPersistentPanel(botId, ticketChannel.id);
    } catch (error) {
      console.error('[Setup] Failed to post panel:', error);
      await interaction.editReply({
        components: [buildErrorContainer('Channels created but failed to post the ticket panel. Run `/panel refresh` to try again.')],
      });
      wizardState.delete(key);
      return;
    }

    // --- Upsert DB config ---
    await prisma.discordBotSetup.upsert({
      where: { id: botId },
      create: {
        id: botId,
        guildId: guild.id,
        ticketChannelId: ticketChannel.id,
        logChannelId: logChannel?.id || null,
        supportCategoryId: supportCategory.id,
        ticketPanelMessageId: panelMessageId,
        dmOnCreate: state.dmOnCreate,
        dmOnUpdate: state.dmOnUpdate,
      },
      update: {
        guildId: guild.id,
        ticketChannelId: ticketChannel.id,
        logChannelId: logChannel?.id || null,
        supportCategoryId: supportCategory.id,
        ticketPanelMessageId: panelMessageId,
        dmOnCreate: state.dmOnCreate,
        dmOnUpdate: state.dmOnUpdate,
      },
    });

    wizardState.delete(key);

    await interaction.editReply({
      components: [
        buildConfirmationContainer(
          ticketChannel.id,
          logChannel?.id || null,
          state.dmOnCreate,
          state.dmOnUpdate
        ),
      ],
    });
  } catch (error) {
    console.error('[Setup] Error confirming setup:', error);
    const key = stateKey(botId, interaction.user.id);
    wizardState.delete(key);
    try {
      const errorContainer = buildErrorContainer('An error occurred during setup. Make sure the bot has **Manage Channels** permission and try `/setup` again.');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ components: [errorContainer] });
      } else {
        await interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }
    } catch {
      // Can't respond at all
    }
  }
}

// ==========================================
// ERROR CONTAINER HELPER
// ==========================================

function buildErrorContainer(message: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xed4245)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# Setup Failed')
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(message)
    );
}