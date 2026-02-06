/**
 * Staff Mappings API
 *
 * GET    - List staff mappings for tenant's bot
 * POST   - Add a new staff mapping (discordUserId, jiraAccountId, displayName)
 * DELETE - Remove a staff mapping by id
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { jiraServiceDesk } from '@/lib/atlassian/client';

export async function GET() {
  try {
    const auth = await requireTenantOwner();
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    const mappings = await prisma.staffMapping.findMany({
      where: { botId: tenant.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        discordUserId: true,
        jiraAccountId: true,
        displayName: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ mappings }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Staff Mappings] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff mappings' },
      { status: 500, headers: securityHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    const body = await request.json();
    const { discordUserId, jiraAccountId, displayName } = body;

    if (!discordUserId || typeof discordUserId !== 'string') {
      return NextResponse.json(
        { error: 'Discord User ID is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!/^\d{17,19}$/.test(discordUserId)) {
      return NextResponse.json(
        { error: 'Invalid Discord User ID format' },
        { status: 400, headers: securityHeaders }
      );
    }

    // jiraAccountId is optional - staff can work without a Jira account
    const trimmedJiraAccountId = jiraAccountId?.trim() || null;

    // Only validate Jira account if one is provided
    if (trimmedJiraAccountId) {
      const jiraUser = await jiraServiceDesk.getUser(trimmedJiraAccountId);
      if (!jiraUser) {
        return NextResponse.json(
          { error: 'Jira account not found. Check the account ID.' },
          { status: 400, headers: securityHeaders }
        );
      }

      if (!jiraUser.active) {
        return NextResponse.json(
          { error: 'Jira account is deactivated.' },
          { status: 400, headers: securityHeaders }
        );
      }

      // Validate the user has access to the Jira project
      const projectKey = process.env.JIRA_PROJECT_KEY || 'SUPPORT';
      const jiraConfig = await prisma.tenantJiraConfig.findUnique({
        where: { tenantId: tenant.id },
      });
      const effectiveProjectKey = jiraConfig?.projectKey || projectKey;

      const isAssignable = await jiraServiceDesk.isUserAssignableInProject(
        trimmedJiraAccountId,
        effectiveProjectKey
      );

      if (!isAssignable) {
        return NextResponse.json(
          { error: `Jira user "${jiraUser.displayName}" does not have access to project ${effectiveProjectKey}.` },
          { status: 400, headers: securityHeaders }
        );
      }
    }

    const mapping = await prisma.staffMapping.upsert({
      where: {
        botId_discordUserId: {
          botId: tenant.id,
          discordUserId,
        },
      },
      create: {
        botId: tenant.id,
        discordUserId,
        jiraAccountId: trimmedJiraAccountId,
        displayName: displayName?.trim() || null,
      },
      update: {
        jiraAccountId: trimmedJiraAccountId,
        displayName: displayName?.trim() || null,
      },
    });

    return NextResponse.json(
      { success: true, mapping: { id: mapping.id, discordUserId: mapping.discordUserId, jiraAccountId: mapping.jiraAccountId, displayName: mapping.displayName } },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Staff Mappings] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save staff mapping' },
      { status: 500, headers: securityHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');

    if (!mappingId) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Delete with tenant verification in the query itself (defense-in-depth)
    // This ensures even if the ID was somehow swapped, the delete won't affect other tenants
    const deleted = await prisma.staffMapping.deleteMany({
      where: { id: mappingId, botId: tenant.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404, headers: securityHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Staff Mappings] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff mapping' },
      { status: 500, headers: securityHeaders }
    );
  }
}
