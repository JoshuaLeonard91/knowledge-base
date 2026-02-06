/**
 * List JSM Projects API
 *
 * GET - Returns JSM (Service Desk) projects from the tenant's connected Jira instance.
 * Requires OAuth-connected Jira config.
 */

import { NextResponse } from 'next/server';
import { requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { getValidAccessToken } from '@/lib/atlassian/token-manager';

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
