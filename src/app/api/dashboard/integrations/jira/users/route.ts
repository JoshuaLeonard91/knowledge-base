/**
 * List Jira Project Users API
 *
 * GET - Returns users who can be assigned to issues in the tenant's selected project.
 * Used for staff mapping dropdown.
 */

import { NextResponse } from 'next/server';
import { requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { getValidAccessToken } from '@/lib/atlassian/token-manager';

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

    if (!config.projectKey) {
      return NextResponse.json(
        { error: 'No project selected' },
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

    // Fetch users assignable to issues in this project
    const response = await fetch(
      `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/user/assignable/search?project=${encodeURIComponent(config.projectKey)}&maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[Jira Users] Failed to fetch:', response.status);
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
