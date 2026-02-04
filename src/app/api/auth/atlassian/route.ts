/**
 * Atlassian OAuth 2.0 (3LO) Redirect Route
 *
 * Initiates the OAuth flow for connecting a tenant's Jira workspace.
 * User must be authenticated (logged in) before connecting Jira.
 * Resolves the tenant from session + request context (same as other Jira routes).
 * Redirects to Atlassian consent screen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { getAuthorizeUrl, isAtlassianOAuthConfigured } from '@/lib/atlassian/oauth';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

function generateState(): string {
  const random = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  return `${random}.${timestamp}`;
}

export async function GET(request: NextRequest) {
  try {
    // Must be logged in to connect Jira
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Session invalid' }, { status: 401 });
    }

    if (!isAtlassianOAuthConfigured()) {
      return NextResponse.json({ error: 'Atlassian OAuth not configured — check ATLASSIAN_OAUTH_CLIENT_ID and ATLASSIAN_OAUTH_CLIENT_SECRET env vars' }, { status: 503 });
    }

    // Resolve tenant from session + request context
    const tenantContext = await getTenantFromRequest();
    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenant = tenantContext
      ? user.tenants.find(t => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant access denied' }, { status: 403 });
    }

    const authBaseUrl = process.env.AUTH_URL || 'http://localhost:3000';

    // Get the current origin (could be tenant subdomain)
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const currentOrigin = `${forwardedProto}://${forwardedHost}`;

    const state = generateState();
    const callbackUrl = `${authBaseUrl.replace(/\/+$/, '')}/api/auth/callback/atlassian`;

    // Store state and tenant info in cookies (same pattern as Discord OAuth)
    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 10, // 10 minutes
      path: '/',
      ...(process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_DOMAIN
        ? { domain: process.env.AUTH_COOKIE_DOMAIN }
        : {}),
    };

    cookieStore.set('jira_oauth_state', state, cookieOptions);
    cookieStore.set('jira_oauth_tenant', tenant.id, cookieOptions);
    cookieStore.set('jira_oauth_origin', currentOrigin, cookieOptions);

    const authorizeUrl = getAuthorizeUrl(state, callbackUrl);
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    console.error('[Atlassian OAuth] Initiate failed:', err);
    return NextResponse.json(
      { error: 'OAuth initiation failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
