/**
 * Project Details API
 *
 * GET - Returns service desk ID and request types for a specific project.
 * Used during onboarding to let the tenant select a request type.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { decryptFromString, encryptToString } from '@/lib/security/crypto';
import { refreshAccessToken } from '@/lib/atlassian/oauth';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

async function getValidAccessToken(config: {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date | null;
}): Promise<string | null> {
  let accessToken = decryptFromString(config.accessToken);

  const isExpired = config.tokenExpiry &&
    new Date(config.tokenExpiry) <= new Date(Date.now() + 5 * 60 * 1000);

  if (isExpired) {
    try {
      const refreshed = await refreshAccessToken(config.refreshToken);
      accessToken = refreshed.access_token;

      await prisma.tenantJiraConfig.update({
        where: { tenantId: config.tenantId },
        data: {
          accessToken: encryptToString(refreshed.access_token),
          refreshToken: encryptToString(refreshed.refresh_token),
          tokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    } catch {
      return null;
    }
  }

  return accessToken;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> }
) {
  try {
    const { projectKey } = await params;

    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: securityHeaders });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Session invalid' }, { status: 401, headers: securityHeaders });
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
