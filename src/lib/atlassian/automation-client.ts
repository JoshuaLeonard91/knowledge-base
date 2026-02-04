/**
 * Jira Automation API Client
 *
 * Wraps the Automation REST API with Basic Auth.
 * Used for one-time admin operations (rule CRUD). Credentials
 * are passed per-request and never stored.
 *
 * Base URL: https://api.atlassian.com/automation/public/jira/{cloudId}/rest/v1
 */

const AUTOMATION_API_BASE = 'https://api.atlassian.com/automation/public/jira';

export interface RuleSummary {
  name: string;
  state: string;
  description: string;
  /** UUID used for GET /rule/{uuid} and DELETE */
  uuid: string;
  authorAccountId: string;
  actorAccountId: string;
  created: number;
  updated: number;
  labels: string[];
  /** ARI strings defining rule scope (e.g., project or site) */
  ruleScopeARIs: string[];
}

export interface RuleConfig {
  name: string;
  state: string;
  description: string;
  authorAccountId: string;
  actor: { type: string; actor: string };
  trigger: Record<string, unknown>;
  components: Record<string, unknown>[];
  ruleScopeARIs: string[];
  [key: string]: unknown;
}

export interface RuleListResponse {
  links: { self: string | null; next: string | null; prev: string | null };
  data: RuleSummary[];
}

export interface RuleGetResponse {
  rule: RuleConfig;
  connections: unknown[];
}

export interface RuleCreateResponse {
  ruleUuid: string;
}

export class AutomationApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string
  ) {
    super(message);
    this.name = 'AutomationApiError';
  }
}

export class JiraAutomationClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(cloudId: string, email: string, apiToken: string) {
    this.baseUrl = `${AUTOMATION_API_BASE}/${cloudId}/rest/v1`;
    this.authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
  }

  /**
   * Validate credentials by calling /rest/api/3/myself.
   * Returns the authenticated user's accountId.
   */
  async validateCredentials(cloudId: string): Promise<{ accountId: string; displayName: string }> {
    const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AutomationApiError(
        response.status === 401
          ? 'Invalid email or API token'
          : 'Failed to validate credentials with Jira',
        response.status,
        body
      );
    }

    const data = await response.json();
    return { accountId: data.accountId, displayName: data.displayName };
  }

  /**
   * List all automation rules (summary view).
   * Optionally filter to rules scoped to a specific project ARI.
   */
  async listRules(projectAri?: string): Promise<RuleSummary[]> {
    const url = `${this.baseUrl}/rule/summary`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AutomationApiError(
        `Failed to list automation rules (${response.status})`,
        response.status,
        body
      );
    }

    const data: RuleListResponse = await response.json();
    let rules = data.data || [];

    if (projectAri) {
      rules = rules.filter((rule) => {
        return rule.ruleScopeARIs?.some((ari) => ari === projectAri) ?? false;
      });
    }

    return rules;
  }

  /**
   * Get a single rule by UUID (full configuration).
   */
  async getRule(uuid: string): Promise<RuleGetResponse> {
    const url = `${this.baseUrl}/rule/${encodeURIComponent(uuid)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AutomationApiError(
        `Failed to get automation rule (${response.status})`,
        response.status,
        body
      );
    }

    return response.json();
  }

  /**
   * Create a new automation rule.
   * Payload must be in { rule: { ... } } format.
   */
  async createRule(payload: Record<string, unknown>): Promise<RuleCreateResponse> {
    const url = `${this.baseUrl}/rule`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AutomationApiError(
        `Failed to create automation rule (${response.status})`,
        response.status,
        body
      );
    }

    return response.json();
  }

  // Note: Jira Cloud Automation API does not support DELETE via REST.
  // Rules must be deleted through the Jira UI (Project Settings > Automation).
}
