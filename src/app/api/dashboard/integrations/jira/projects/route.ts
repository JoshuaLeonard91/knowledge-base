/**
 * List JSM Projects API
 *
 * GET - Returns JSM (Service Desk) projects from the tenant's connected Jira instance.
 * Requires OAuth-connected Jira config.
 */

import { NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { decryptFromString, encryptToString } from '@/lib/security/crypto';
import { refreshAccessToken } from '@/lib/atlassian/oauth';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

/**
 * Get a valid OAuth access token for the tenant, refreshing if needed.
 */
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

export async function GET() {
  try {
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

    // Fetch JSM projects
    const response = await fetch(
      `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/project/search?typeKey=service_desk&maxResults=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[Jira Projects] Failed to fetch:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch projects from Jira' },
        { status: 502, headers: securityHeaders }
      );
    }

    const data = await response.json();
    const projects = (data.values || []).map((p: { id: string; key: string; name: string; style?: string }) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      style: p.style || 'unknown', // "classic" or "next-gen"
    }));

    return NextResponse.json({ projects }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Jira Projects] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500, headers: securityHeaders }
    );
  }
}
