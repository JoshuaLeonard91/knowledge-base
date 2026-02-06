/**
 * Project Details API
 *
 * GET - Returns service desk ID and request types for a specific project.
 * Used during onboarding to let the tenant select a request type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { getValidAccessToken } from '@/lib/atlassian/token-manager';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> }
) {
  try {
    const { projectKey } = await params;

    const auth = await requireTenantOwner();
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    const config = await prisma.tenantJiraConfig.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!config?.connected || config.authMode !== 'oauth' || !config.cloudId || !config.accessToken || !config.refreshToken) {
      return NextResponse.json(
        { error: 'Jira not connected via OAuth' },
        { status: 400, headers: securityHeaders }
      );
    }

    const accessToken = await getValidAccessToken({
      tenantId: tenant.id,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      tokenExpiry: config.tokenExpiry,
    });

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with Jira. Please reconnect.' },
        { status: 401, headers: securityHeaders }
      );
    }

    const baseUrl = `https://api.atlassian.com/ex/jira/${config.cloudId}`;

    // Get service desk by project key
    const sdResponse = await fetch(
      `${baseUrl}/rest/servicedeskapi/servicedesk/${encodeURIComponent(projectKey)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!sdResponse.ok) {
      console.error('[Jira Project Details] Service desk not found:', sdResponse.status);
      return NextResponse.json(
        { error: 'Service desk not found for this project' },
        { status: 404, headers: securityHeaders }
      );
    }

    const serviceDesk = await sdResponse.json();
    const serviceDeskId = serviceDesk.id;

    // Get request types for this service desk
    const rtResponse = await fetch(
      `${baseUrl}/rest/servicedeskapi/servicedesk/${serviceDeskId}/requesttype?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!rtResponse.ok) {
      console.error('[Jira Project Details] Failed to fetch request types:', rtResponse.status);
      return NextResponse.json(
        { error: 'Failed to fetch request types' },
        { status: 502, headers: securityHeaders }
      );
    }

    const rtData = await rtResponse.json();
    const requestTypes = (rtData.values || []).map((rt: { id: string; name: string; description?: string }) => ({
      id: rt.id,
      name: rt.name,
      description: rt.description || '',
    }));

    return NextResponse.json(
      { serviceDeskId, requestTypes },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Jira Project Details] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get project details' },
      { status: 500, headers: securityHeaders }
    );
  }
}
