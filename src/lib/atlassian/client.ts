/**
 * Atlassian Jira Service Management Client
 *
 * Handles service request creation via Jira Service Management REST API.
 * Falls back to mock behavior if not configured.
 *
 * Required environment variables:
 * - ATLASSIAN_DOMAIN: Your Atlassian domain (e.g., 'yourcompany.atlassian.net')
 * - ATLASSIAN_EMAIL: Account email for API authentication
 * - ATLASSIAN_API_TOKEN: API token from Atlassian account settings
 * - JIRA_SERVICE_DESK_ID: Service desk ID (found in Service Desk settings)
 * - JIRA_REQUEST_TYPE_ID: Request type ID for support requests (optional, uses default)
 */

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
      statusCategory: {
        key: string;
        colorName: string;
      };
    };
    priority?: {
      name: string;
    };
    created: string;
    updated: string;
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    labels?: string[];
  };
}

export interface ServiceRequest {
  issueId: string;
  issueKey: string;
  requestTypeId: string;
  serviceDeskId: string;
  createdDate: {
    iso8601: string;
    friendly: string;
  };
  reporter: {
    displayName: string;
    emailAddress?: string;
  };
  currentStatus: {
    status: string;
    statusCategory: string;
  };
}

export interface CreateRequestInput {
  summary: string;
  description: string;
  requesterName: string;
  requesterEmail?: string;
  discordUserId?: string;
  discordUsername?: string;
  discordServerId?: string;
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  labels?: string[];
}

export interface CreateRequestResponse {
  success: boolean;
  issueKey?: string;
  issueId?: string;
  error?: string;
}

const ATLASSIAN_DOMAIN = process.env.ATLASSIAN_DOMAIN || '';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || '';
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || '';
const JIRA_SERVICE_DESK_ID = process.env.JIRA_SERVICE_DESK_ID || '';
const JIRA_REQUEST_TYPE_ID = process.env.JIRA_REQUEST_TYPE_ID || '';

class JiraServiceDeskClient {
  private baseUrl: string;
  private serviceDeskApiUrl: string;
  private authHeader: string;
  private isConfigured: boolean;
  private serviceDeskId: string;
  private requestTypeId: string;

  constructor() {
    this.isConfigured = Boolean(
      ATLASSIAN_DOMAIN && ATLASSIAN_EMAIL && ATLASSIAN_API_TOKEN && JIRA_SERVICE_DESK_ID
    );
    this.baseUrl = ATLASSIAN_DOMAIN ? `https://${ATLASSIAN_DOMAIN}/rest/api/3` : '';
    this.serviceDeskApiUrl = ATLASSIAN_DOMAIN
      ? `https://${ATLASSIAN_DOMAIN}/rest/servicedeskapi`
      : '';
    this.serviceDeskId = JIRA_SERVICE_DESK_ID;
    this.requestTypeId = JIRA_REQUEST_TYPE_ID;

    // Atlassian uses email:api_token for authentication (Basic Auth)
    const credentials = `${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`;
    this.authHeader = this.isConfigured
      ? `Basic ${Buffer.from(credentials).toString('base64')}`
      : '';
  }

  /**
   * Check if Jira Service Desk is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error?: string }> {
    if (!this.isConfigured) {
      return { data: null, error: 'Atlassian not configured' };
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: this.authHeader,
          'X-Atlassian-Token': 'no-check',
          ...options.headers,
        },
      });

      if (!response.ok) {
        // Don't log error body - may contain sensitive data
        return {
          data: null,
          error: 'External service error',
        };
      }

      const data = await response.json();
      return { data };
    } catch {
      // Don't expose internal error details
      return {
        data: null,
        error: 'External service unavailable',
      };
    }
  }

  /**
   * Create a new service request (ticket)
   * Uses Service Desk API for customer portal-style requests
   */
  async createRequest(input: CreateRequestInput): Promise<CreateRequestResponse> {
    // If not configured, return mock success
    if (!this.isConfigured) {
      const mockKey = `MOCK-${Date.now().toString(36).toUpperCase()}`;
      return {
        success: true,
        issueKey: mockKey,
        issueId: `mock-${Date.now()}`,
      };
    }

    // Build description with metadata
    let fullDescription = input.description;
    fullDescription += '\n\n----\n';
    fullDescription += '*Submitted via Support Portal*\n';
    if (input.discordServerId) {
      fullDescription += `Discord Server ID: ${input.discordServerId}\n`;
    }
    if (input.discordUsername) {
      fullDescription += `Discord Username: ${input.discordUsername}\n`;
    }
    if (input.discordUserId) {
      fullDescription += `Discord User ID: ${input.discordUserId}\n`;
    }

    // Try Service Desk API first (preferred for customer requests)
    if (this.serviceDeskId) {
      const sdResult = await this.createServiceDeskRequest(input, fullDescription);
      if (sdResult.success) {
        return sdResult;
      }
      // Fall back to standard Jira API silently
    }

    // Fallback to standard Jira API
    return this.createJiraIssue(input, fullDescription);
  }

  /**
   * Create request via Service Desk API
   */
  private async createServiceDeskRequest(
    input: CreateRequestInput,
    description: string
  ): Promise<CreateRequestResponse> {
    const payload: Record<string, unknown> = {
      serviceDeskId: this.serviceDeskId,
      requestFieldValues: {
        summary: input.summary,
        description: description,
      },
    };

    // Add request type if configured
    if (this.requestTypeId) {
      payload.requestTypeId = this.requestTypeId;
    }

    // Add customer info if email provided
    if (input.requesterEmail) {
      payload.raiseOnBehalfOf = input.requesterEmail;
    }

    const result = await this.fetch<ServiceRequest>(
      `${this.serviceDeskApiUrl}/request`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to create service request',
      };
    }

    return {
      success: true,
      issueKey: result.data.issueKey,
      issueId: result.data.issueId,
    };
  }

  /**
   * Create issue via standard Jira API (fallback)
   */
  private async createJiraIssue(
    input: CreateRequestInput,
    description: string
  ): Promise<CreateRequestResponse> {
    // Get project key from service desk ID or use default
    const projectKey = process.env.JIRA_PROJECT_KEY || 'SUPPORT';

    const payload = {
      fields: {
        project: {
          key: projectKey,
        },
        summary: input.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description,
                },
              ],
            },
          ],
        },
        issuetype: {
          name: 'Task', // Common default issue type
        },
        labels: input.labels || ['support-portal'],
      },
    };

    const result = await this.fetch<{ id: string; key: string }>(
      `${this.baseUrl}/issue`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (result.error || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to create Jira issue',
      };
    }

    return {
      success: true,
      issueKey: result.data.key,
      issueId: result.data.id,
    };
  }

  /**
   * Assign an issue to a Jira user by account ID
   */
  async assignIssue(issueKey: string, accountId: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/issue/${issueKey}/assignee`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: this.authHeader,
          },
          body: JSON.stringify({ accountId }),
        }
      );

      return response.ok; // 204 No Content on success
    } catch {
      return false;
    }
  }

  /**
   * Get issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue | null> {
    if (!this.isConfigured) {
      return null;
    }

    const result = await this.fetch<JiraIssue>(`${this.baseUrl}/issue/${issueKey}`);
    return result.data;
  }

  /**
   * Search issues by JQL (using new /search/jql endpoint)
   */
  async searchIssues(jql: string, maxResults = 50): Promise<JiraIssue[]> {
    if (!this.isConfigured) {
      return [];
    }

    // Use the new /search/jql POST endpoint (old /search is deprecated)
    const result = await this.fetch<{ issues: JiraIssue[] }>(
      `${this.baseUrl}/search/jql`,
      {
        method: 'POST',
        body: JSON.stringify({
          jql,
          maxResults,
          fields: ['summary', 'status', 'created', 'updated', 'description', 'priority', 'reporter', 'labels'],
        }),
      }
    );
    return result.data?.issues || [];
  }

  /**
   * Add comment to an issue
   */
  async addComment(issueKey: string, comment: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    const result = await this.fetch<{ id: string }>(
      `${this.baseUrl}/issue/${issueKey}/comment`,
      {
        method: 'POST',
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: comment,
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    return result.data !== null;
  }

  /**
   * Add an attachment to an issue
   */
  async addAttachment(issueKey: string, file: Buffer, filename: string, mimeType: string): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file)], { type: mimeType });
      formData.append('file', blob, filename);

      const response = await fetch(
        `${this.baseUrl}/issue/${issueKey}/attachments`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            'X-Atlassian-Token': 'no-check',
          },
          body: formData,
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available request types for service desk
   */
  async getRequestTypes(): Promise<Array<{ id: string; name: string; description: string }>> {
    if (!this.isConfigured || !this.serviceDeskId) {
      return [];
    }

    const result = await this.fetch<{
      values: Array<{ id: string; name: string; description: string }>;
    }>(`${this.serviceDeskApiUrl}/servicedesk/${this.serviceDeskId}/requesttype`);

    return result.data?.values || [];
  }

  /**
   * Escape special characters in JQL text search values
   * Prevents JQL injection attacks
   */
  private escapeJqlText(value: string): string {
    // JQL text search special characters that need escaping
    // Also escape backslashes first, then quotes
    return value
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')     // Escape double quotes
      .replace(/'/g, "\\'")     // Escape single quotes
      .replace(/\[/g, '\\[')    // Escape brackets
      .replace(/\]/g, '\\]')
      .replace(/\{/g, '\\{')    // Escape braces
      .replace(/\}/g, '\\}')
      .replace(/\(/g, '\\(')    // Escape parentheses
      .replace(/\)/g, '\\)')
      .replace(/\+/g, '\\+')    // Escape operators
      .replace(/-/g, '\\-')
      .replace(/&/g, '\\&')
      .replace(/\|/g, '\\|')
      .replace(/!/g, '\\!')
      .replace(/\^/g, '\\^')
      .replace(/~/g, '\\~')
      .replace(/\*/g, '\\*')
      .replace(/\?/g, '\\?')
      .replace(/:/g, '\\:');
  }

  /**
   * Get tickets for a specific Discord user
   */
  async getTicketsByDiscordUser(discordUserId: string, discordUsername?: string): Promise<JiraIssue[]> {
    if (!this.isConfigured) {
      return [];
    }

    const projectKey = process.env.JIRA_PROJECT_KEY || 'SUPPORT';

    // Escape user inputs to prevent JQL injection
    const escapedUserId = this.escapeJqlText(discordUserId);

    // Search by Discord User ID or username in description
    // Also search in labels for backwards compatibility
    let jql = `project = ${projectKey} AND (description ~ "${escapedUserId}"`;

    if (discordUsername) {
      const escapedUsername = this.escapeJqlText(discordUsername);
      jql += ` OR description ~ "${escapedUsername}"`;
    }

    jql += `) ORDER BY created DESC`;

    return this.searchIssues(jql, 50);
  }

  /**
   * Get a single ticket with comments
   */
  async getTicketWithComments(issueKey: string): Promise<{
    issue: JiraIssue | null;
    comments: Array<{
      id: string;
      author: string;
      body: string;
      created: string;
    }>;
  }> {
    if (!this.isConfigured) {
      return { issue: null, comments: [] };
    }

    const issue = await this.getIssue(issueKey);
    if (!issue) {
      return { issue: null, comments: [] };
    }

    // Fetch comments
    const commentsResult = await this.fetch<{
      comments: Array<{
        id: string;
        author: { displayName: string };
        body: { content: Array<{ content: Array<{ text: string }> }> };
        created: string;
      }>;
    }>(`${this.baseUrl}/issue/${issueKey}/comment`);

    const comments = commentsResult.data?.comments?.map(c => ({
      id: c.id,
      author: c.author?.displayName || 'Unknown',
      body: c.body?.content?.[0]?.content?.[0]?.text || '',
      created: c.created,
    })) || [];

    return { issue, comments };
  }
}

// Export singleton instance
export const jiraServiceDesk = new JiraServiceDeskClient();
