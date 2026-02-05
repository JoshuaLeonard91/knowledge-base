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

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string; // download URL
  created: string;
}

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
    assignee?: {
      displayName: string;
      accountId: string;
    } | null;
    labels?: string[];
    attachment?: JiraAttachment[];
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

/**
 * Config for creating a client instance.
 *
 * Two auth modes:
 * - Basic auth: domain + email + apiToken (env-var fallback for main domain)
 * - OAuth: cloudId + oauthAccessToken (for tenant OAuth connections)
 */
export interface JiraClientConfig {
  // Basic auth mode
  domain?: string;       // e.g. "acme.atlassian.net"
  email?: string;
  apiToken?: string;
  // OAuth mode
  cloudId?: string;
  oauthAccessToken?: string;
  // Shared
  serviceDeskId?: string;
  requestTypeId?: string;
  projectKey?: string;
}

export class JiraServiceDeskClient {
  private baseUrl: string;
  private serviceDeskApiUrl: string;
  private authHeader: string;
  private isConfigured: boolean;
  private serviceDeskId: string;
  private requestTypeId: string;
  private configProjectKey: string;
  private authMode: 'basic' | 'oauth';

  constructor(config?: JiraClientConfig) {
    const sdId = config?.serviceDeskId || JIRA_SERVICE_DESK_ID;
    const rtId = config?.requestTypeId || JIRA_REQUEST_TYPE_ID;
    this.serviceDeskId = sdId;
    this.requestTypeId = rtId;
    this.configProjectKey = config?.projectKey || '';

    if (config?.oauthAccessToken && config?.cloudId) {
      // OAuth mode: route through api.atlassian.com proxy
      this.authMode = 'oauth';
      this.baseUrl = `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3`;
      this.serviceDeskApiUrl = `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/servicedeskapi`;
      this.authHeader = `Bearer ${config.oauthAccessToken}`;
      this.isConfigured = true;
    } else {
      // Basic auth mode (existing behavior, env-var fallback)
      this.authMode = 'basic';
      const domain = config?.domain || ATLASSIAN_DOMAIN;
      const email = config?.email || ATLASSIAN_EMAIL;
      const apiToken = config?.apiToken || ATLASSIAN_API_TOKEN;

      this.isConfigured = Boolean(domain && email && apiToken && sdId);
      this.baseUrl = domain ? `https://${domain}/rest/api/3` : '';
      this.serviceDeskApiUrl = domain
        ? `https://${domain}/rest/servicedeskapi`
        : '';

      const credentials = `${email}:${apiToken}`;
      this.authHeader = this.isConfigured
        ? `Basic ${Buffer.from(credentials).toString('base64')}`
        : '';
    }
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
        // Log status but not body (may contain sensitive data)
        const errorBody = await response.text().catch(() => '(failed to read body)');
        console.error('[Jira Client] Request failed:', {
          status: response.status,
          statusText: response.statusText,
          url: url.replace(/\/rest\/.*/, '/rest/...'), // Truncate for privacy
          body: errorBody,
        });
        return {
          data: null,
          error: `External service error (${response.status})`,
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
    // Get project key from config, then env var, then default
    const projectKey = this.configProjectKey || process.env.JIRA_PROJECT_KEY || 'SUPPORT';

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
   * Get a Jira user by account ID.
   * Returns null if the user doesn't exist or is deactivated.
   */
  async getUser(accountId: string): Promise<{ accountId: string; displayName: string; active: boolean } | null> {
    if (!this.isConfigured) return null;

    const result = await this.fetch<{ accountId: string; displayName: string; active: boolean }>(
      `${this.baseUrl}/user?accountId=${encodeURIComponent(accountId)}`
    );

    return result.data;
  }

  /**
   * Check if a user is assignable in a Jira project.
   * Uses the assignable user search endpoint.
   */
  async isUserAssignableInProject(accountId: string, projectKey: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    // Fetch the user first to get their displayName for the query
    const user = await this.getUser(accountId);
    if (!user) return false;

    // Search assignable users in the project, filtering by the user's display name
    const result = await this.fetch<Array<{ accountId: string }>>(
      `${this.baseUrl}/user/assignable/search?project=${encodeURIComponent(projectKey)}&query=${encodeURIComponent(user.displayName)}&maxResults=50`
    );

    if (!result.data) return false;

    // Check if the target accountId is in the results
    return result.data.some(u => u.accountId === accountId);
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
        `${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/assignee`,
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
   * Transition an issue to a target status by name (e.g., "In Progress").
   * Fetches available transitions, finds one matching the target, and applies it.
   * Returns true if the transition succeeded or the issue is already in that status.
   */
  async transitionIssue(issueKey: string, targetStatusName: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      // Get available transitions for the issue
      const result = await this.fetch<{
        transitions: Array<{ id: string; name: string; to: { name: string; statusCategory?: { name: string } } }>;
      }>(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/transitions`);

      if (!result.data?.transitions) return false;

      // Find a transition whose target status matches (case-insensitive)
      // Match against: transition name, target status name, or target status category name
      const target = targetStatusName.toLowerCase();
      const transition = result.data.transitions.find(
        t => t.to.name.toLowerCase() === target
          || t.name.toLowerCase() === target
          || t.to.statusCategory?.name.toLowerCase() === target
      );

      if (!transition) {
        console.warn(
          `[Jira] No transition found for ${issueKey} to "${targetStatusName}". Available:`,
          result.data.transitions.map(t => `${t.name} → ${t.to.name} (${t.to.statusCategory?.name || '?'})`).join(', ')
        );
        return false;
      }

      // Execute the transition
      const response = await fetch(
        `${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/transitions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: this.authHeader,
          },
          body: JSON.stringify({
            transition: { id: transition.id },
          }),
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

    const result = await this.fetch<JiraIssue>(`${this.baseUrl}/issue/${encodeURIComponent(issueKey)}`);
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
      `${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/comment`,
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
        `${this.baseUrl}/issue/${encodeURIComponent(issueKey)}/attachments`,
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

    const projectKey = this.configProjectKey || process.env.JIRA_PROJECT_KEY || 'SUPPORT';

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
      mediaAttachmentIds: string[];
    }>;
  }> {
    if (!this.isConfigured) {
      return { issue: null, comments: [] };
    }

    const issue = await this.getIssue(issueKey);
    if (!issue) {
      return { issue: null, comments: [] };
    }

    // Fetch comments with full ADF body
    const commentsResult = await this.fetch<{
      comments: Array<{
        id: string;
        author: { displayName: string };
        body: unknown;
        created: string;
      }>;
    }>(`${this.baseUrl}/issue/${issueKey}/comment`);

    const comments = commentsResult.data?.comments?.map(c => {
      const { text, attachmentIds } = extractAdfContent(c.body);
      return {
        id: c.id,
        author: c.author?.displayName || 'Unknown',
        body: text,
        created: c.created,
        mediaAttachmentIds: attachmentIds,
      };
    }) || [];

    return { issue, comments };
  }

  /**
   * Download an attachment from Jira by its content URL.
   * Requires auth headers since attachment URLs are protected.
   */
  async downloadAttachment(url: string): Promise<Buffer | null> {
    if (!this.isConfigured) return null;

    // Validate URL domain to prevent SSRF — only allow Atlassian-owned hosts
    try {
      const parsed = new URL(url);
      const validHosts = ['.atlassian.net', '.atlassian.com', '.jira.com', '.atl-paas.net'];
      if (!validHosts.some(h => parsed.hostname.endsWith(h))) {
        console.warn(`[Jira] Blocked attachment download from untrusted host: ${parsed.hostname}`);
        return null;
      }
    } catch {
      return null;
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: '*/*',
        },
      });

      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }
}

// ==========================================
// ADF (Atlassian Document Format) PARSER
// ==========================================

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
}

/**
 * Extract plain text and media attachment IDs from a Jira ADF document.
 * Handles: text, paragraph, hardBreak, heading, bulletList, orderedList,
 * listItem, blockquote, codeBlock, mediaSingle, media, rule, table, etc.
 */
function extractAdfContent(body: unknown): { text: string; attachmentIds: string[] } {
  const attachmentIds: string[] = [];

  if (typeof body === 'string') {
    return { text: body, attachmentIds: [] };
  }

  if (!body || typeof body !== 'object') {
    return { text: '', attachmentIds: [] };
  }

  const doc = body as { content?: AdfNode[] };
  if (!doc.content) {
    return { text: '', attachmentIds: [] };
  }

  function walkNode(node: AdfNode): string {
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'rule') return '\n---\n';

    // Media nodes — extract attachment ID
    if (node.type === 'media' && node.attrs) {
      const id = node.attrs.id as string;
      if (id) attachmentIds.push(id);
      return '';
    }
    if (node.type === 'mediaSingle') {
      return node.content ? node.content.map(walkNode).join('') : '';
    }

    // Block-level nodes that separate with newlines
    if (node.content) {
      const inner = node.content.map(walkNode).join('');
      if (['paragraph', 'heading', 'blockquote', 'codeBlock', 'listItem'].includes(node.type)) {
        return inner + '\n';
      }
      return inner;
    }

    return '';
  }

  const text = doc.content.map(walkNode).join('').replace(/\n{3,}/g, '\n\n').trim();
  return { text, attachmentIds };
}

// Export singleton instance
export const jiraServiceDesk = new JiraServiceDeskClient();
