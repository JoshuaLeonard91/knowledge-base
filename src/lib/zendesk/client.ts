/**
 * Zendesk API Client
 *
 * Handles communication with Zendesk Support API v2.
 * Uses Basic Auth (email/token) per Zendesk's API auth scheme.
 *
 * Docs: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/
 */

// ==========================================
// TYPES
// ==========================================

export interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
  priority: 'urgent' | 'high' | 'normal' | 'low' | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  custom_fields: Array<{ id: number; value: string | null }>;
  requester_id: number;
  external_id: string | null;
}

export interface ZendeskComment {
  id: number;
  body: string;
  author_id: number;
  created_at: string;
  public: boolean;
}

export interface ZendeskUser {
  id: number;
  name: string;
  email: string;
  external_id: string | null;
}

interface ZendeskConfig {
  subdomain: string;
  email: string;
  apiToken: string;
}

// ==========================================
// CLIENT
// ==========================================

export class ZendeskClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: ZendeskConfig) {
    this.baseUrl = `https://${config.subdomain}.zendesk.com/api/v2`;
    // Zendesk API auth: email/token:{api_token}
    this.authHeader = Buffer.from(
      `${config.email}/token:${config.apiToken}`
    ).toString('base64');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${this.authHeader}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(
          `Zendesk API ${response.status}: ${response.statusText} - ${errorText}`
        );
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Create or find a Zendesk user by Discord ID (stored as external_id)
   */
  async findOrCreateUser(
    discordUserId: string,
    discordUsername: string,
    email?: string
  ): Promise<ZendeskUser> {
    // Search by external_id first
    const searchResult = await this.request<{
      users: ZendeskUser[];
    }>(`/users/search.json?external_id=${encodeURIComponent(discordUserId)}`);

    if (searchResult.users.length > 0) {
      return searchResult.users[0];
    }

    // Create new user
    const createResult = await this.request<{ user: ZendeskUser }>(
      '/users/create_or_update.json',
      {
        method: 'POST',
        body: JSON.stringify({
          user: {
            name: discordUsername,
            external_id: discordUserId,
            email: email || `${discordUserId}@discord.user.placeholder`,
            verified: true,
          },
        }),
      }
    );

    return createResult.user;
  }

  /**
   * Create a new ticket
   */
  async createTicket(params: {
    subject: string;
    description: string;
    priority?: 'urgent' | 'high' | 'normal' | 'low';
    tags?: string[];
    requesterId: number;
    externalId?: string;
  }): Promise<ZendeskTicket> {
    const result = await this.request<{ ticket: ZendeskTicket }>(
      '/tickets.json',
      {
        method: 'POST',
        body: JSON.stringify({
          ticket: {
            subject: params.subject,
            comment: { body: params.description },
            priority: params.priority || 'normal',
            tags: params.tags || [],
            requester_id: params.requesterId,
            external_id: params.externalId,
          },
        }),
      }
    );

    return result.ticket;
  }

  /**
   * Get a single ticket by ID
   */
  async getTicket(ticketId: number): Promise<ZendeskTicket | null> {
    try {
      const result = await this.request<{ ticket: ZendeskTicket }>(
        `/tickets/${ticketId}.json`
      );
      return result.ticket;
    } catch {
      return null;
    }
  }

  /**
   * List tickets for a requester
   */
  async listTicketsByRequester(requesterId: number): Promise<ZendeskTicket[]> {
    const result = await this.request<{ tickets: ZendeskTicket[] }>(
      `/users/${requesterId}/tickets/requested.json?sort_by=updated_at&sort_order=desc`
    );
    return result.tickets;
  }

  /**
   * Get comments on a ticket
   */
  async getTicketComments(ticketId: number): Promise<ZendeskComment[]> {
    const result = await this.request<{ comments: ZendeskComment[] }>(
      `/tickets/${ticketId}/comments.json`
    );
    return result.comments;
  }

  /**
   * Add a public comment to a ticket
   */
  async addComment(ticketId: number, body: string): Promise<boolean> {
    try {
      await this.request(`/tickets/${ticketId}.json`, {
        method: 'PUT',
        body: JSON.stringify({
          ticket: {
            comment: { body, public: true },
          },
        }),
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test credentials by fetching current user
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.request<{ user: ZendeskUser }>('/users/me.json');
      return !!result.user?.id;
    } catch {
      return false;
    }
  }
}
