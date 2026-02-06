/**
 * Jira Automation Single Rule API
 *
 * POST - Get full rule configuration by UUID.
 * Uses one-time admin credentials (not stored).
 *
 * Note: Jira Cloud Automation API does not support DELETE via REST.
 * Rules must be deleted through the Jira UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { JiraAutomationClient, AutomationApiError } from '@/lib/atlassian/automation-client';

type RouteContext = { params: Promise<{ uuid: string }> };

/**
 * Get full rule configuration by UUID
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    const body = await request.json();
    const { email, apiToken } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400, headers: securityHeaders });
    }

    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json({ error: 'API token is required' }, { status: 400, headers: securityHeaders });
    }

    const config = await prisma.tenantJiraConfig.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!config?.cloudId || !config.projectId) {
      return NextResponse.json(
        { error: 'Jira must be connected and a project must be selected first' },
        { status: 400, headers: securityHeaders }
      );
    }

    const client = new JiraAutomationClient(config.cloudId, email, apiToken);

    try {
      await client.validateCredentials(config.cloudId);
    } catch (err) {
      if (err instanceof AutomationApiError && err.status === 401) {
        return NextResponse.json({ error: 'Invalid email or API token' }, { status: 400, headers: securityHeaders });
      }
      return NextResponse.json({ error: 'Failed to validate credentials with Jira' }, { status: 400, headers: securityHeaders });
    }

    const { uuid } = await context.params;

    try {
      const result = await client.getRule(uuid);
      return NextResponse.json(result, { headers: securityHeaders });
    } catch (err) {
      if (err instanceof AutomationApiError) {
        console.error('[Jira Automation] Get rule failed:', err.status, err.body);
        return NextResponse.json(
          { error: `Failed to get automation rule (${err.status})` },
          { status: err.status === 404 ? 404 : 502, headers: securityHeaders }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('[Jira Automation] Error getting rule:', error);
    return NextResponse.json(
      { error: 'Failed to get automation rule' },
      { status: 500, headers: securityHeaders }
    );
  }
}
