/**
 * Staff Mappings API
 *
 * GET    - List staff mappings for tenant's bot
 * POST   - Add a new staff mapping (discordUserId, jiraAccountId, displayName)
 * DELETE - Remove a staff mapping by id
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { validateCsrfRequest } from '@/lib/security/csrf';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { jiraServiceDesk } from '@/lib/atlassian/client';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

/** Resolve the tenant for the current user */
async function resolveTenant() {
  const authenticated = await isAuthenticated();
  if (!authenticated) return { error: 'Not authenticated', status: 401 };

  const session = await getSession();
  if (!session) return { error: 'Session invalid', status: 401 };

  const tenantContext = await getTenantFromRequest();

  const user = await prisma.user.findUnique({
    where: { discordId: session.id },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return { error: 'No tenant found', status: 404 };
  }

  const tenant = tenantContext
    ? user.tenants.find((t) => t.slug === tenantContext.slug) || user.tenants[0]
    : user.tenants[0];

  if (!tenant) {
    return { error: 'Tenant access denied', status: 403 };
  }

  return { tenant };
}

export async function GET() {
  try {
    const result = await resolveTenant();
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: securityHeaders }
      );
    }

    const mappings = await prisma.staffMapping.findMany({
      where: { botId: result.tenant.id },
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
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

    const result = await resolveTenant();
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: securityHeaders }
      );
    }

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

    if (!jiraAccountId || typeof jiraAccountId !== 'string') {
      return NextResponse.json(
        { error: 'Jira Account ID is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate the Jira account exists and is active
    const jiraUser = await jiraServiceDesk.getUser(jiraAccountId.trim());
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
      where: { tenantId: result.tenant.id },
    });
    const effectiveProjectKey = jiraConfig?.projectKey || projectKey;

    const isAssignable = await jiraServiceDesk.isUserAssignableInProject(
      jiraAccountId.trim(),
      effectiveProjectKey
    );

    if (!isAssignable) {
      return NextResponse.json(
        { error: `Jira user "${jiraUser.displayName}" does not have access to project ${effectiveProjectKey}.` },
        { status: 400, headers: securityHeaders }
      );
    }

    const mapping = await prisma.staffMapping.upsert({
      where: {
        botId_discordUserId: {
          botId: result.tenant.id,
          discordUserId,
        },
      },
      create: {
        botId: result.tenant.id,
        discordUserId,
        jiraAccountId: jiraAccountId.trim(),
        displayName: displayName?.trim() || null,
      },
      update: {
        jiraAccountId: jiraAccountId.trim(),
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
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

    const result = await resolveTenant();
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: securityHeaders }
      );
    }

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
      where: { id: mappingId, botId: result.tenant.id },
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
