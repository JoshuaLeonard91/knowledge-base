/**
 * Jira Automation Rule Builders
 *
 * Builds rule payloads in the exact format accepted by the Automation API:
 *   POST https://api.atlassian.com/automation/public/jira/{cloudId}/rest/v1/rule
 *
 * The format was verified by GET /rest/v1/rule/{uuid} on a working rule
 * and confirmed via successful 201 Created responses.
 *
 * Key requirements:
 * - Wrapped in { rule: { ... } }
 * - `component` field on trigger ("TRIGGER") and actions ("ACTION")
 * - `schemaVersion: 1` on trigger and components
 * - `conditions: []` and `children: []` on components
 * - `actor.actor` (not `actor.value`)
 * - `ruleScopeARIs` array of ARI strings
 */

export interface AutomationRuleBase {
  cloudId: string;
  projectId: string;
  ownerAccountId: string;
  authorAccountId: string;
}

interface WebhookRuleOptions extends AutomationRuleBase {
  webhookUrl: string;
}

// StatusChangedRuleOptions is same as WebhookRuleOptions for now
// (filtering by specific status transitions not yet implemented)

function buildProjectAri(cloudId: string, projectId: string): string {
  return `ari:cloud:jira:${cloudId}:project/${projectId}`;
}

function buildRuleShell(
  name: string,
  opts: AutomationRuleBase,
  trigger: Record<string, unknown>,
  components: Record<string, unknown>[]
) {
  const projectAri = buildProjectAri(opts.cloudId, opts.projectId);

  return {
    rule: {
      name,
      state: 'ENABLED',
      description: '',
      canOtherRuleTrigger: false,
      notifyOnError: 'FIRSTERROR',
      authorAccountId: opts.authorAccountId,
      actor: {
        type: 'ACCOUNT_ID',
        actor: opts.ownerAccountId,
      },
      trigger: {
        component: 'TRIGGER',
        schemaVersion: 1,
        ...trigger,
        conditions: [],
      },
      components: components.map((c) => ({
        component: 'ACTION',
        schemaVersion: 1,
        ...c,
        conditions: [],
        children: [],
      })),
      ruleScopeARIs: [projectAri],
      labels: [],
      writeAccessType: 'OWNER_ONLY',
      collaborators: [],
    },
  };
}

function buildWebhookAction(webhookUrl: string, customBody: string) {
  return {
    type: 'jira.issue.outgoing.webhook',
    value: {
      url: webhookUrl,
      method: 'POST',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      sendIssue: false,
      contentType: 'custom',
      customBody,
    },
  };
}

/**
 * Comment added → Send webhook
 */
export function buildCommentWebhookRule(opts: WebhookRuleOptions) {
  const projectAri = buildProjectAri(opts.cloudId, opts.projectId);
  const customBody = JSON.stringify({
    webhookEvent: 'comment_created',
    issueKey: '{{issue.key}}',
    commentId: '{{comment.id}}',
  }, null, 2);

  return buildRuleShell(
    'Webhook - Comment Notification',
    opts,
    {
      type: 'jira.issue.event.trigger:commented',
      value: {
        eventTypes: [],
        eventFilters: [projectAri],
      },
    },
    [buildWebhookAction(opts.webhookUrl, customBody)]
  );
}

/**
 * Issue status changed → Send webhook
 * Triggers when issue transitions between statuses (e.g., Open → In Progress → Resolved)
 * Format verified from Jira UI-created rule.
 */
export function buildStatusChangedWebhookRule(opts: WebhookRuleOptions) {
  const projectAri = buildProjectAri(opts.cloudId, opts.projectId);
  const customBody = JSON.stringify({
    webhookEvent: 'status_changed',
    issueKey: '{{issue.key}}',
    fromStatus: '{{changelog.fromString}}',
    toStatus: '{{changelog.toString}}',
  }, null, 2);

  return buildRuleShell(
    'Webhook - Status Changed',
    opts,
    {
      type: 'jira.issue.event.trigger:transitioned',
      value: {
        eventFilters: [projectAri],
        fromStatus: [],
        toStatus: [],
      },
    },
    [buildWebhookAction(opts.webhookUrl, customBody)]
  );
}

