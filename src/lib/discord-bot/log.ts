/**
 * Discord Bot Log Channel
 *
 * Posts ticket activity (creates, comments) to a configured log channel.
 * Uses simple embeds (not V2) for admin visibility.
 */

import { EmbedBuilder } from 'discord.js';
import { botManager } from './manager';
import { getBotSetup } from './helpers';

// ==========================================
// LOG: TICKET CREATED
// ==========================================

export async function logTicketCreated(params: {
  botId: string;
  ticketId: string;
  summary: string;
  category: string;
  severity: string;
  discordUserId: string;
  discordUsername: string;
}): Promise<void> {
  try {
    const setup = await getBotSetup(params.botId);
    if (!setup?.logChannelId) return;

    const client = botManager.getBot(params.botId);
    if (!client) return;

    const channel = await client.channels.fetch(setup.logChannelId);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x57f287) // green
      .setTitle('Ticket Created')
      .addFields(
        { name: 'Ticket', value: params.ticketId, inline: true },
        { name: 'Category', value: params.category, inline: true },
        { name: 'Severity', value: params.severity.charAt(0).toUpperCase() + params.severity.slice(1), inline: true },
        { name: 'Created by', value: `${params.discordUsername} (<@${params.discordUserId}>)` },
        { name: 'Summary', value: params.summary },
      )
      .setTimestamp();

    await (channel as { send: Function }).send({ embeds: [embed] });
  } catch (error) {
    console.error('[Log] Failed to log ticket created:', error);
  }
}

// ==========================================
// LOG: TICKET COMMENT
// ==========================================

export async function logTicketComment(params: {
  botId: string;
  ticketId: string;
  commentAuthor: string;
  commentPreview: string;
  isStaff: boolean;
}): Promise<void> {
  try {
    const setup = await getBotSetup(params.botId);
    if (!setup?.logChannelId) return;

    const client = botManager.getBot(params.botId);
    if (!client) return;

    const channel = await client.channels.fetch(setup.logChannelId);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(params.isStaff ? 0x5865f2 : 0xfee75c) // blurple for staff, yellow for user
      .setTitle('New Comment')
      .addFields(
        { name: 'Ticket', value: params.ticketId, inline: true },
        { name: 'Author', value: params.commentAuthor, inline: true },
        { name: 'Type', value: params.isStaff ? 'Staff Reply' : 'User Reply', inline: true },
        { name: 'Preview', value: params.commentPreview.length > 200
          ? params.commentPreview.substring(0, 197) + '...'
          : params.commentPreview },
      )
      .setTimestamp();

    await (channel as { send: Function }).send({ embeds: [embed] });
  } catch (error) {
    console.error('[Log] Failed to log ticket comment:', error);
  }
}

// ==========================================
// LOG: TICKET CLAIMED
// ==========================================

export async function logTicketClaimed(params: {
  botId: string;
  ticketId: string;
  claimedByUsername: string;
  claimedByUserId: string;
  assignedInJira: boolean;
}): Promise<void> {
  try {
    const setup = await getBotSetup(params.botId);
    if (!setup?.logChannelId) return;

    const client = botManager.getBot(params.botId);
    if (!client) return;

    const channel = await client.channels.fetch(setup.logChannelId);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0xe67e22) // orange
      .setTitle('Ticket Claimed')
      .addFields(
        { name: 'Ticket', value: params.ticketId, inline: true },
        { name: 'Claimed by', value: `${params.claimedByUsername} (<@${params.claimedByUserId}>)`, inline: true },
        { name: 'Assigned in Jira', value: params.assignedInJira ? 'Yes' : 'No', inline: true },
      )
      .setTimestamp();

    await (channel as { send: Function }).send({ embeds: [embed] });
  } catch (error) {
    console.error('[Log] Failed to log ticket claimed:', error);
  }
}
