/**
 * List Jira Project Users API
 *
 * GET - Returns users who can be assigned to issues in the tenant's selected project.
 * Used for staff mapping dropdown.
 */

import { NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { getValidAccessToken } from '@/lib/atlassian/token-manager';

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: {
    '48x48'?: string;
  };
  active: boolean;
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

    // Detailed config logging
    console.log('[Jira Users] Config check:', {
      connected: config?.connected,
      authMode: config?.authMode,
      hasCloudId: !!config?.cloudId,
      cloudId: config?.cloudId,
      hasAccessToken: !!config?.accessToken,
      hasRefreshToken: !!config?.refreshToken,
      tokenExpiry: config?.tokenExpiry,
      projectKey: config?.projectKey,
    });

    if (!config?.connected || config.authMode !== 'oauth' || !config.cloudId || !config.accessToken || !config.refreshToken) {
      return NextResponse.json(
        { error: 'Jira not connected via OAuth' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!config.projectKey) {
      return NextResponse.json(
        { error: 'No project selected' },
        { status: 400, headers: securityHeaders }
      );
    }

    console.log('[Jira Users] Calling getValidAccessToken...');
    const accessToken = await getValidAccessToken({
      tenantId: tenant.id,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      tokenExpiry: config.tokenExpiry,
    });

    if (!accessToken) {
      console.error('[Jira Users] getValidAccessToken returned null - token refresh likely failed');
      return NextResponse.json(
        { error: 'Failed to authenticate with Jira. Please reconnect.' },
        { status: 401, headers: securityHeaders }
      );
    }

    console.log('[Jira Users] Got access token, length:', accessToken.length, 'prefix:', accessToken.substring(0, 10) + '...');

    // Fetch users assignable to issues in this project
    const url = `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/user/assignable/search?project=${encodeURIComponent(config.projectKey)}&maxResults=100`;
    console.log(`[Jira Users] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Jira Users] Failed to fetch:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorBody,
      });
      return NextResponse.json(
        { error: 'Failed to fetch users from Jira' },
        { status: 502, headers: securityHeaders }
      );
    }

    const data: JiraUser[] = await response.json();

    // Filter to active users and map to a simpler format
    const users = data
      .filter(u => u.active)
      .map(u => ({
        accountId: u.accountId,
        displayName: u.displayName,
        email: u.emailAddress || null,
        avatar: u.avatarUrls?.['48x48'] || null,
      }));

    return NextResponse.json({ users }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Jira Users] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500, headers: securityHeaders }
    );
  }
}
