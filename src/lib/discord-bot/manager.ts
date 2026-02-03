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

const commands = [ticketCommand.toJSON()];

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
      intents: [GatewayIntentBits.Guilds],
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
        await rest.put(
          Routes.applicationGuildCommands(client.user!.id, guildId),
          { body: commands }
        );
        console.log(
          `[BotManager] Registered commands for guild ${guildId}`
        );
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
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'ticket') {
        await handleTicketCommand(interaction, tenantId);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('ticket_category:')) {
        await handleTicketCategorySelect(interaction, tenantId);
      }
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('ticket_severity:')) {
        await handleTicketSeverityButton(interaction);
      } else if (interaction.customId.startsWith('ticket_next:')) {
        await handleTicketNextButton(interaction);
      } else {
        // Reply buttons from DM notifications
        await handleButtonInteraction(interaction, tenantId);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_modal:')) {
        await handleTicketModal(interaction);
      } else {
        // Reply modals from DM notifications
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
