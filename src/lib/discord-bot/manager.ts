/**
 * Discord Bot Manager
 *
 * Manages multiple Discord.js client instances — one per tenant.
 * Each tenant provides their own bot token. The manager:
 * - Connects/disconnects bots dynamically
 * - Registers slash commands on connect
 * - Routes interactions to handlers
 * - Provides a singleton instance for the app lifecycle
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
import { handleTicketCommand } from './commands/ticket';
import { handleButtonInteraction } from './interactions/reply';

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
  .setDescription('Create a support ticket')
  .addStringOption((option) =>
    option
      .setName('category')
      .setDescription('Ticket category')
      .setRequired(true)
      .addChoices(
        { name: 'General Support', value: 'general' },
        { name: 'Billing', value: 'billing' },
        { name: 'Bug Report', value: 'bug' },
        { name: 'Feature Request', value: 'feature' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('description')
      .setDescription('Describe your issue')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('severity')
      .setDescription('How severe is this issue?')
      .setRequired(false)
      .addChoices(
        { name: 'Low', value: 'low' },
        { name: 'Medium', value: 'medium' },
        { name: 'High', value: 'high' },
        { name: 'Critical', value: 'critical' }
      )
  );

const commands = [ticketCommand.toJSON()];

// ==========================================
// BOT MANAGER
// ==========================================

class BotManager {
  private bots = new Map<string, TenantBot>();
  private initialized = false;

  /**
   * Initialize: load all enabled tenant bot configs and connect
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    console.log('[BotManager] Initializing...');

    try {
      const configs = await prisma.tenantDiscordBotConfig.findMany({
        where: { enabled: true },
        include: { tenant: true },
      });

      console.log(`[BotManager] Found ${configs.length} enabled bot configs`);

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
   * Connect a bot for a tenant
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
      console.log(
        `[BotManager] Bot ready for tenant ${tenantId}: ${client.user?.tag}`
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
          `[BotManager] Interaction error for tenant ${tenantId}:`,
          error
        );
      }
    });

    client.on('error', (error) => {
      console.error(`[BotManager] Client error for tenant ${tenantId}:`, error);
    });

    this.bots.set(tenantId, tenantBot);

    try {
      await client.login(botToken);
      return true;
    } catch (error) {
      console.error(`[BotManager] Login failed for tenant ${tenantId}:`, error);
      this.bots.delete(tenantId);
      return false;
    }
  }

  /**
   * Disconnect a tenant's bot
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
      console.log(`[BotManager] Disconnected bot for tenant ${tenantId}`);
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
    } else if (interaction.isButton() || interaction.isModalSubmit()) {
      await handleButtonInteraction(interaction, tenantId);
    }
  }

  /**
   * Get a bot client for a tenant (used by notification service)
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
