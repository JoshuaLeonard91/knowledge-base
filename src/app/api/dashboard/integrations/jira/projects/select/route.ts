/**
 * Save Project Selection API
 *
 * POST - Saves the tenant's selected project, service desk, and request type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { invalidateTenantProviderCache } from '@/lib/ticketing/adapter';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    const body = await request.json();
    const { projectKey, projectId, serviceDeskId, requestTypeId } = body;

    if (!projectKey || !projectId || !serviceDeskId || !requestTypeId) {
      return NextResponse.json(
        { error: 'projectKey, projectId, serviceDeskId, and requestTypeId are all required' },
        { status: 400, headers: securityHeaders }
      );
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

    // Invalidate cached provider so new project settings are used immediately
    invalidateTenantProviderCache(tenant.id);

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
