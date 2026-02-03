/**
 * Discord Bot Manager
 *
 * Manages multiple Discord.js client instances:
 * - Main domain bot: configured via env vars (DISCORD_BOT_TOKEN, DISCORD_GUILD_ID)
 * - Tenant bots: configured via DB (TenantDiscordBotConfig)
 *
 * The main domain bot uses env-var Jira/Hygraph.
 * Tenant bots use their own DB-stored Jira/Hygraph configs.
 */

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  type Interaction,
} from 'discord.js';
import { prisma } from '@/lib/db/client';
import { decryptFromString } from '@/lib/security/crypto';
import {
  handleTicketCommand,
  handleTicketCategorySelect,
  handleTicketSeverityButton,
  handleTicketNextButton,
  handleTicketModal,
} from './commands/ticket';
import {
  handleSetupCommand,
  handleSetupTicketChannelSelect,
  handleSetupLogChannelSelect,
  handleSetupSkipLogButton,
  handleSetupDmToggle,
  handleSetupConfirmButton,
} from './commands/setup';
import {
  handlePanelCategorySelect,
  handlePanelSeveritySelect,
  handlePanelCreateButton,
  handlePanelModal,
} from './commands/panel';
import {
  handlePanelCommand,
  handlePanelEditModal,
} from './commands/panel-config';
import { handleClaimCommand } from './commands/claim';
import { handleButtonInteraction } from './interactions/reply';

import { MAIN_DOMAIN_BOT_ID } from './constants';

// ==========================================
// TYPES
// ==========================================

interface TenantBot {
  tenantId: string;
  guildId: string;
  client: Client;
  ready: boolean;
}

// ==========================================
// SLASH COMMAND DEFINITIONS
// ==========================================

const ticketCommand = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Create a support ticket');

const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure the support bot for this server (owner only)');

const panelCommand = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Customize the ticket panel (owner only)')
  .addSubcommand(sub => sub
    .setName('edit')
    .setDescription('Edit panel title, description, button, and info lines'))
  .addSubcommand(sub => sub
    .setName('refresh')
    .setDescription('Re-post the panel with current config'));

const claimCommand = new SlashCommandBuilder()
  .setName('claim')
  .setDescription('Claim a support ticket')
  .addStringOption(opt => opt
    .setName('ticket')
    .setDescription('Ticket ID (e.g. SUPPORT-142)')
    .setRequired(true));

const commands = [ticketCommand.toJSON(), setupCommand.toJSON(), panelCommand.toJSON(), claimCommand.toJSON()];

// ==========================================
// BOT MANAGER
// ==========================================

class BotManager {
  private bots = new Map<string, TenantBot>();
  private initialized = false;

  /**
   * Initialize: connect main domain bot (env vars) + all enabled tenant bots (DB)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    console.log('[BotManager] Initializing...');

    // Connect main domain bot from env vars
    const mainToken = process.env.DISCORD_BOT_TOKEN;
    const mainGuild = process.env.DISCORD_GUILD_ID;

    if (mainToken && mainGuild) {
      try {
        await this.connectBot(MAIN_DOMAIN_BOT_ID, mainToken, mainGuild);
        console.log('[BotManager] Main domain bot connected');
      } catch (error) {
        console.error('[BotManager] Failed to connect main domain bot:', error);
      }
    }

    // Connect tenant bots from DB
    try {
      const configs = await prisma.tenantDiscordBotConfig.findMany({
        where: { enabled: true },
        include: { tenant: true },
      });

      console.log(`[BotManager] Found ${configs.length} enabled tenant bot configs`);

      for (const config of configs) {
        try {
          await this.connectBot(
            config.tenantId,
            decryptFromString(config.botToken),
            config.guildId
          );
        } catch (error) {
          console.error(
            `[BotManager] Failed to connect bot for tenant ${config.tenantId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('[BotManager] Initialize error:', error);
    }
  }

  /**
   * Connect a bot for a tenant (or main domain)
   */
  async connectBot(
    tenantId: string,
    botToken: string,
    guildId: string
  ): Promise<boolean> {
    // Disconnect existing if any
    await this.disconnectBot(tenantId);

    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
    });

    const tenantBot: TenantBot = {
      tenantId,
      guildId,
      client,
      ready: false,
    };

    // Set up event handlers
    client.once('ready', async () => {
      tenantBot.ready = true;
      const label = tenantId === MAIN_DOMAIN_BOT_ID ? 'main domain' : `tenant ${tenantId}`;
      console.log(
        `[BotManager] Bot ready for ${label}: ${client.user?.tag}`
      );

      // Register slash commands for this guild
      try {
        const rest = new REST({ version: '10' }).setToken(botToken);
        console.log(`[BotManager] Registering ${commands.length} commands for guild ${guildId} (app: ${client.user!.id}):`);
        for (const cmd of commands) {
          console.log(`[BotManager]   - /${cmd.name}: ${cmd.description}`);
        }
        const result = await rest.put(
          Routes.applicationGuildCommands(client.user!.id, guildId),
          { body: commands }
        );
        const registered = result as Array<{ name: string; id: string }>;
        console.log(`[BotManager] Successfully registered ${registered.length} commands for guild ${guildId}:`);
        for (const cmd of registered) {
          console.log(`[BotManager]   - /${cmd.name} (id: ${cmd.id})`);
        }
      } catch (error) {
        console.error(
          `[BotManager] Failed to register commands for guild ${guildId}:`,
          error
        );
      }
    });

    client.on('interactionCreate', async (interaction: Interaction) => {
      try {
        await this.handleInteraction(interaction, tenantId);
      } catch (error) {
        console.error(
          `[BotManager] Interaction error for ${tenantId}:`,
          error
        );
      }
    });

    client.on('error', (error) => {
      console.error(`[BotManager] Client error for ${tenantId}:`, error);
    });

    this.bots.set(tenantId, tenantBot);

    try {
      await client.login(botToken);
      return true;
    } catch (error) {
      console.error(`[BotManager] Login failed for ${tenantId}:`, error);
      this.bots.delete(tenantId);
      return false;
    }
  }

  /**
   * Disconnect a bot
   */
  async disconnectBot(tenantId: string): Promise<void> {
    const bot = this.bots.get(tenantId);
    if (bot) {
      try {
        bot.client.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.bots.delete(tenantId);
      console.log(`[BotManager] Disconnected bot for ${tenantId}`);
    }
  }

  /**
   * Route interaction to the correct handler
   */
  private async handleInteraction(
    interaction: Interaction,
    tenantId: string
  ): Promise<void> {
    // === Slash Commands ===
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ticket') {
        await handleTicketCommand(interaction, tenantId);
      } else if (interaction.commandName === 'setup') {
        await handleSetupCommand(interaction, tenantId);
      } else if (interaction.commandName === 'panel') {
        await handlePanelCommand(interaction, tenantId);
      } else if (interaction.commandName === 'claim') {
        await handleClaimCommand(interaction, tenantId);
      }
    }
    // === Channel Select Menus ===
    else if (interaction.isChannelSelectMenu()) {
      const cid = interaction.customId;
      if (cid.startsWith('setup_ticketch:')) {
        await handleSetupTicketChannelSelect(interaction, tenantId);
      } else if (cid.startsWith('setup_logch:')) {
        await handleSetupLogChannelSelect(interaction, tenantId);
      }
    }
    // === String Select Menus ===
    else if (interaction.isStringSelectMenu()) {
      const cid = interaction.customId;
      if (cid.startsWith('ticket_category:')) {
        await handleTicketCategorySelect(interaction, tenantId);
      } else if (cid.startsWith('panel_category:')) {
        await handlePanelCategorySelect(interaction, tenantId);
      } else if (cid.startsWith('panel_severity:')) {
        await handlePanelSeveritySelect(interaction, tenantId);
      }
    }
    // === Buttons ===
    else if (interaction.isButton()) {
      const cid = interaction.customId;
      if (cid.startsWith('ticket_severity:')) {
        await handleTicketSeverityButton(interaction);
      } else if (cid.startsWith('ticket_next:')) {
        await handleTicketNextButton(interaction);
      } else if (cid.startsWith('panel_create:')) {
        await handlePanelCreateButton(interaction);
      } else if (cid.startsWith('setup_skiplog:')) {
        await handleSetupSkipLogButton(interaction, tenantId);
      } else if (cid.startsWith('setup_dmcreate:') || cid.startsWith('setup_dmupdate:')) {
        await handleSetupDmToggle(interaction, tenantId);
      } else if (cid.startsWith('setup_confirm:')) {
        await handleSetupConfirmButton(interaction, tenantId);
      } else if (cid.startsWith('reply:')) {
        await handleButtonInteraction(interaction, tenantId);
      }
    }
    // === Modals ===
    else if (interaction.isModalSubmit()) {
      const cid = interaction.customId;
      if (cid.startsWith('ticket_modal:')) {
        await handleTicketModal(interaction);
      } else if (cid.startsWith('panel_modal:')) {
        await handlePanelModal(interaction);
      } else if (cid.startsWith('panel_edit_modal:')) {
        await handlePanelEditModal(interaction);
      } else if (cid.startsWith('reply-modal:')) {
        await handleButtonInteraction(interaction, tenantId);
      }
    }
  }

  /**
   * Get a bot client (used by notification service)
   */
  getBot(tenantId: string): Client | null {
    const bot = this.bots.get(tenantId);
    return bot?.ready ? bot.client : null;
  }

  /**
   * Get status of all bots
   */
  getStatus(): Array<{ tenantId: string; guildId: string; ready: boolean }> {
    return Array.from(this.bots.values()).map((bot) => ({
      tenantId: bot.tenantId,
      guildId: bot.guildId,
      ready: bot.ready,
    }));
  }

  /**
   * Shutdown all bots
   */
  async shutdown(): Promise<void> {
    console.log('[BotManager] Shutting down all bots...');
    for (const [tenantId] of this.bots) {
      await this.disconnectBot(tenantId);
    }
  }
}

// Singleton
export const botManager = new BotManager();
