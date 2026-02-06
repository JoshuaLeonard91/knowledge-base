/**
 * Jira Automation Rules List API
 *
 * POST - Lists automation rules for the tenant's project.
 * Uses one-time admin credentials (not stored).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { JiraAutomationClient, AutomationApiError } from '@/lib/atlassian/automation-client';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

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

    // Validate credentials
    try {
      await client.validateCredentials(config.cloudId);
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

    // List rules filtered to this tenant's project
    const projectAri = `ari:cloud:jira:${config.cloudId}:project/${config.projectId}`;

    try {
      const rules = await client.listRules(projectAri);
      return NextResponse.json({
        rules: rules.map((r) => ({
          uuid: r.uuid,
          name: r.name,
          state: r.state,
          created: r.created,
          updated: r.updated,
          ruleScopeARIs: r.ruleScopeARIs,
        })),
      }, { headers: securityHeaders });
    } catch (err) {
      if (err instanceof AutomationApiError) {
        console.error('[Jira Automation] List rules failed:', err.status);
        return NextResponse.json(
          { error: `Failed to list automation rules (${err.status})` },
          { status: 502, headers: securityHeaders }
        );
      }
      throw err;
    }
  } catch (error) {
    console.error('[Jira Automation] Error listing rules:', error);
    return NextResponse.json(
      { error: 'Failed to list automation rules' },
      { status: 500, headers: securityHeaders }
    );
  }
}
