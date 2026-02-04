/**
 * Jira Automation Rule Creation API
 *
 * POST - Creates a project-level Jira Automation rule that sends webhook
 * notifications when comments are added to tickets.
 *
 * Uses a one-time admin API token (not stored) to call the Automation API,
 * since the Automation API does not support OAuth 2.0 tokens.
 *
 * Also generates and stores a webhook secret in TenantWebhookConfig.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { validateCsrfRequest } from '@/lib/security/csrf';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

const AUTOMATION_API_BASE = 'https://api.atlassian.com/automation/public/jira';

/**
 * Build the automation rule payload for "Comment added → Send web request"
 *
 * Note: The Automation Rule Management API has undocumented component schemas.
 * This payload structure was reverse-engineered from the Jira Automation UI
 * by creating a rule manually and exporting it via GET /rest/v1/rule/{uuid}.
 */
function buildCommentWebhookRule(webhookUrl: string, projectAri: string) {
  return {
    name: 'Webhook - Comment Notification',
    state: 'ENABLED',
    ruleScopeARIs: [projectAri],
    trigger: {
      component: 'TRIGGER',
      type: 'jira.issue.event.trigger:comment-created',
      value: {
        eventKey: 'comment_created',
      },
    },
    actions: [
      {
        component: 'ACTION',
        type: 'jira.automation.action:send-web-request',
        value: {
          url: webhookUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhookEvent: 'comment_created',
            issueKey: '{{issue.key}}',
          }),
        },
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 403, headers: securityHeaders });
    }

    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: securityHeaders });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Session invalid' }, { status: 401, headers: securityHeaders });
    }

    const body = await request.json();
    const { email, apiToken } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    const tenantContext = await getTenantFromRequest();

    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { tenants: { include: { jiraConfig: true } } },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404, headers: securityHeaders });
    }

    const tenant = tenantContext
      ? user.tenants.find(t => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant access denied' }, { status: 403, headers: securityHeaders });
    }

    const config = tenant.jiraConfig;
    if (!config?.cloudId || !config.projectId) {
      return NextResponse.json(
        { error: 'Jira must be connected and a project must be selected first' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate the admin API token first
    const validateUrl = `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/myself`;
    const basicAuth = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

    const validateResponse = await fetch(validateUrl, {
      headers: { Authorization: basicAuth, Accept: 'application/json' },
    });

    if (!validateResponse.ok) {
      const status = validateResponse.status;
      if (status === 401) {
        return NextResponse.json(
          { error: 'Invalid email or API token' },
          { status: 400, headers: securityHeaders }
        );
      }
      return NextResponse.json(
        { error: 'Failed to validate credentials with Jira' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Generate webhook secret
    const webhookSecret = randomBytes(32).toString('hex');

    // Build the webhook URL
    const appUrl = process.env.AUTH_URL || 'https://helpportal.app';
    const webhookUrl = `${appUrl}/api/webhooks/jira?secret=${webhookSecret}&tenant=${tenant.id}`;

    // Build the automation rule
    const projectAri = `ari:cloud:jira:${config.cloudId}:project/${config.projectId}`;
    const rulePayload = buildCommentWebhookRule(webhookUrl, projectAri);

    // Create the rule via Automation API (Basic Auth only — OAuth not supported)
    const automationUrl = `${AUTOMATION_API_BASE}/${config.cloudId}/rest/v1/rule`;
    const ruleResponse = await fetch(automationUrl, {
      method: 'POST',
      headers: {
        Authorization: basicAuth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(rulePayload),
    });

    if (!ruleResponse.ok) {
      const errorText = await ruleResponse.text();
      console.error('[Jira Automation] Rule creation failed:', ruleResponse.status, errorText);
      return NextResponse.json(
        { error: `Failed to create automation rule (${ruleResponse.status}). Ensure the account has Jira admin permissions.` },
        { status: 502, headers: securityHeaders }
      );
    }

    // Store webhook secret
    await prisma.tenantWebhookConfig.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        webhookSecret,
        webhookEnabled: true,
      },
      update: {
        webhookSecret,
        webhookEnabled: true,
        webhookFailureCount: 0,
      },
    });

    // Mark automation as created
    await prisma.tenantJiraConfig.update({
      where: { tenantId: tenant.id },
      data: { automationRuleCreated: true },
    });

    console.log(`[Jira Automation] Rule created for tenant ${tenant.id} (project ARI: ${projectAri})`);

    // API token is NOT stored — it was used once and is now discarded
    return NextResponse.json({ success: true }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Jira Automation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500, headers: securityHeaders }
    );
  }
}
