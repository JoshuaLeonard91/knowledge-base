/**
 * /ticket Slash Command Handler
 *
 * Creates a support ticket via the tenant's configured ticket provider.
 * User must be in the guild where the command is run.
 */

import type { ChatInputCommandInteraction } from 'discord.js';
import { getTicketProviderForTenant } from '@/lib/ticketing/adapter';

// Category display names
const categoryNames: Record<string, string> = {
  general: 'General Support',
  billing: 'Billing',
  bug: 'Bug Report',
  feature: 'Feature Request',
};

export async function handleTicketCommand(
  interaction: ChatInputCommandInteraction,
  tenantId: string
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    // Get ticket provider for this tenant
    const provider = await getTicketProviderForTenant(tenantId);

    if (!provider) {
      await interaction.editReply({
        content:
          'Ticketing is not configured for this server. Ask the server admin to set up a ticket provider.',
      });
      return;
    }

    // Extract command options
    const category = interaction.options.getString('category', true);
    const description = interaction.options.getString('description', true);
    const severity = interaction.options.getString('severity') || 'medium';

    // Validate description length
    if (description.length < 10) {
      await interaction.editReply({
        content: 'Please provide a more detailed description (at least 10 characters).',
      });
      return;
    }

    if (description.length > 4000) {
      await interaction.editReply({
        content: 'Description is too long. Please keep it under 4000 characters.',
      });
      return;
    }

    // Map severity to priority
    const severityToPriority: Record<string, 'lowest' | 'low' | 'medium' | 'high' | 'highest'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'highest',
    };
    const priority = severityToPriority[severity] || 'medium';

    const categoryName = categoryNames[category] || 'Support Request';
    const summary = `[${categoryName}] Support Request`;
    const labels = [
      'discord',
      'discord-bot',
      `category-${category}`,
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

    await interaction.editReply({
      content: [
        `Ticket created: **${result.ticketId}**`,
        '',
        `**Category:** ${categoryName}`,
        `**Severity:** ${severity.charAt(0).toUpperCase() + severity.slice(1)}`,
        '',
        'You can view and reply to your ticket on the support portal.',
      ].join('\n'),
    });
  } catch (error) {
    console.error('[TicketCommand] Error:', error);
    await interaction.editReply({
      content: 'An error occurred while creating your ticket. Please try again later.',
    });
  }
}
