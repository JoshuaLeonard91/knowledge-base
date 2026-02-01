/**
 * Zendesk Ticket Provider
 *
 * Implements the TicketProvider interface for Zendesk Support.
 * Maps Zendesk ticket data to the common ticket format.
 */

import { ZendeskClient } from '@/lib/zendesk/client';
import type {
  TicketProvider,
  CreateTicketInput,
  CreateTicketResult,
  TicketListItem,
  Ticket,
  AddCommentInput,
} from '../types';

// ==========================================
// HELPERS
// ==========================================

/** Map Zendesk status to our normalized status categories */
function normalizeStatusCategory(
  status: string
): 'new' | 'indeterminate' | 'done' | 'undefined' {
  switch (status) {
    case 'new':
      return 'new';
    case 'open':
    case 'pending':
    case 'hold':
      return 'indeterminate';
    case 'solved':
    case 'closed':
      return 'done';
    default:
      return 'undefined';
  }
}

/** Map our priority to Zendesk priority */
function mapPriority(
  priority: string
): 'urgent' | 'high' | 'normal' | 'low' {
  switch (priority) {
    case 'highest':
      return 'urgent';
    case 'high':
      return 'high';
    case 'medium':
      return 'normal';
    case 'low':
    case 'lowest':
      return 'low';
    default:
      return 'normal';
  }
}

/** Capitalize first letter of status for display */
function displayStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ==========================================
// ZENDESK PROVIDER
// ==========================================

export class ZendeskTicketProvider implements TicketProvider {
  readonly name = 'Zendesk';
  private client: ZendeskClient;

  constructor(client: ZendeskClient) {
    this.client = client;
  }

  isAvailable(): boolean {
    return true; // If constructed, credentials were provided
  }

  async createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
    try {
      // Find or create Zendesk user for this Discord user
      const zendeskUser = await this.client.findOrCreateUser(
        input.discordUserId,
        input.discordUsername,
        input.requesterEmail
      );

      // Build description with metadata
      const fullDescription = [
        input.description,
        '',
        '----',
        `Discord User ID: ${input.discordUserId}`,
        `Discord Username: ${input.discordUsername}`,
        input.discordServerId
          ? `Discord Server ID: ${input.discordServerId}`
          : null,
        '*Submitted via Support Portal*',
      ]
        .filter(Boolean)
        .join('\n');

      const ticket = await this.client.createTicket({
        subject: input.summary,
        description: fullDescription,
        priority: mapPriority(input.priority),
        tags: input.labels,
        requesterId: zendeskUser.id,
        externalId: `discord:${input.discordUserId}`,
      });

      return {
        success: true,
        ticketId: String(ticket.id),
      };
    } catch (error) {
      console.error('[Zendesk] createTicket error:', error);
      return {
        success: false,
        error: 'Failed to create Zendesk ticket',
      };
    }
  }

  async listTickets(discordUserId: string): Promise<TicketListItem[]> {
    try {
      const zendeskUser = await this.client.findOrCreateUser(
        discordUserId,
        'Unknown'
      );

      const tickets = await this.client.listTicketsByRequester(zendeskUser.id);

      return tickets.map((ticket) => ({
        id: String(ticket.id),
        summary: ticket.subject,
        status: displayStatus(ticket.status),
        statusCategory: normalizeStatusCategory(ticket.status),
        created: ticket.created_at,
        updated: ticket.updated_at,
      }));
    } catch (error) {
      console.error('[Zendesk] listTickets error:', error);
      return [];
    }
  }

  async getTicket(
    ticketId: string,
    discordUserId: string
  ): Promise<Ticket | null> {
    try {
      const ticket = await this.client.getTicket(Number(ticketId));
      if (!ticket) return null;

      // Verify ownership via external_id on the requester
      const zendeskUser = await this.client.findOrCreateUser(
        discordUserId,
        'Unknown'
      );
      if (ticket.requester_id !== zendeskUser.id) {
        return null; // Not the ticket owner
      }

      // Get comments
      const comments = await this.client.getTicketComments(Number(ticketId));

      // Sanitize description — remove metadata after ----
      let description = ticket.description || '';
      const separatorIndex = description.indexOf('----');
      if (separatorIndex !== -1) {
        description = description.substring(0, separatorIndex).trim();
      }

      return {
        id: String(ticket.id),
        summary: ticket.subject,
        description,
        status: displayStatus(ticket.status),
        statusCategory: normalizeStatusCategory(ticket.status),
        priority: ticket.priority
          ? displayStatus(ticket.priority)
          : undefined,
        created: ticket.created_at,
        updated: ticket.updated_at,
        comments: comments
          .slice(1) // Skip first comment (it's the ticket description)
          .filter((c) => c.public)
          .map((c) => ({
            id: String(c.id),
            author:
              c.author_id === zendeskUser.id ? 'You' : 'Support Team',
            body: c.body,
            created: c.created_at,
            isStaff: c.author_id !== zendeskUser.id,
          })),
      };
    } catch (error) {
      console.error('[Zendesk] getTicket error:', error);
      return null;
    }
  }

  async addComment(input: AddCommentInput): Promise<boolean> {
    try {
      // Verify ownership
      const ticket = await this.client.getTicket(Number(input.ticketId));
      if (!ticket) return false;

      const zendeskUser = await this.client.findOrCreateUser(
        input.discordUserId,
        input.discordUsername
      );
      if (ticket.requester_id !== zendeskUser.id) {
        return false;
      }

      return this.client.addComment(Number(input.ticketId), input.message);
    } catch (error) {
      console.error('[Zendesk] addComment error:', error);
      return false;
    }
  }
}
