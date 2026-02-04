/**
 * Save Project Selection API
 *
 * POST - Saves the tenant's selected project, service desk, and request type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { validateCsrfRequest } from '@/lib/security/csrf';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

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
    const { projectKey, projectId, serviceDeskId, requestTypeId } = body;

    if (!projectKey || !projectId || !serviceDeskId || !requestTypeId) {
      return NextResponse.json(
        { error: 'projectKey, projectId, serviceDeskId, and requestTypeId are all required' },
        { status: 400, headers: securityHeaders }
      );
    }

    const tenantContext = await getTenantFromRequest();

    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { tenants: true },
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

    await prisma.tenantJiraConfig.update({
      where: { tenantId: tenant.id },
      data: {
        projectKey: String(projectKey),
        projectId: String(projectId),
        serviceDeskId: String(serviceDeskId),
        requestTypeId: String(requestTypeId),
      },
    });

    console.log(`[Jira Config] Project selected: ${projectKey} (SD: ${serviceDeskId}, RT: ${requestTypeId})`);

    return NextResponse.json({ success: true }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Jira Config] Project selection error:', error);
    return NextResponse.json(
      { error: 'Failed to save project selection' },
      { status: 500, headers: securityHeaders }
    );
  }
}
