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
import { JiraAutomationClient, AutomationApiError } from '@/lib/atlassian/automation-client';
import { buildCommentWebhookRule } from '@/lib/atlassian/automation-rules';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

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

    const client = new JiraAutomationClient(config.cloudId, email, apiToken);

    // Validate the admin API token first
    let ownerAccountId: string;
    let authorAccountId: string;
    try {
      const myself = await client.validateCredentials(config.cloudId);
      ownerAccountId = myself.accountId;
      authorAccountId = myself.accountId;
    } catch (err) {
      if (err instanceof AutomationApiError && err.status === 401) {
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
    const webhookUrl = `${appUrl.replace(/\/+$/, '')}/api/webhooks/jira?secret=${webhookSecret}&tenant=${tenant.id}`;

    // Build the automation rule payload
    const rulePayload = buildCommentWebhookRule({
      webhookUrl,
      cloudId: config.cloudId,
      projectId: config.projectId,
      ownerAccountId,
      authorAccountId,
    });

    // Create the rule via Automation API
    console.log('[Jira Automation] Creating rule for project', config.projectKey);

    try {
      await client.createRule(rulePayload);
    } catch (err) {
      if (err instanceof AutomationApiError) {
        console.error('[Jira Automation] Rule creation failed:', err.status);
        return NextResponse.json(
          { error: `Failed to create automation rule (${err.status}). Ensure the account has Jira admin permissions.` },
          { status: 502, headers: securityHeaders }
        );
      }
      throw err;
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

    console.log(`[Jira Automation] Rule created for tenant ${tenant.id} (project: ${config.projectKey})`);

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
