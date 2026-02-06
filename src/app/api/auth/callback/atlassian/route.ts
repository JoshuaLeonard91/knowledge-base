/**
 * Atlassian OAuth 2.0 (3LO) Callback Handler
 *
 * Exchanges authorization code for tokens, discovers cloudId,
 * stores encrypted tokens in TenantJiraConfig, and redirects
 * back to the tenant's dashboard.
 *
 * Flow:
 * 1. Tenant admin clicks "Connect Jira" on their dashboard
 * 2. Redirected to Atlassian consent screen (via /api/auth/atlassian)
 * 3. Atlassian redirects here with authorization code
 * 4. Exchange code for tokens, discover cloudId
 * 5. Store tokens in DB, redirect to tenant dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAuthenticated, getSession } from '@/lib/auth';
import { exchangeCodeForTokens, getAccessibleResources } from '@/lib/atlassian/oauth';
import { encryptToString } from '@/lib/security/crypto';
import { prisma } from '@/lib/db/client';
import { invalidateTenantProviderCache } from '@/lib/ticketing/adapter';

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes (matches cookie maxAge)

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const authBaseUrl = process.env.AUTH_URL || 'http://localhost:3000';

  // Read stored cookies
  const storedState = cookieStore.get('jira_oauth_state')?.value;
  const tenantId = cookieStore.get('jira_oauth_tenant')?.value;
  const rawOrigin = cookieStore.get('jira_oauth_origin')?.value || authBaseUrl;

  // Validate tenantOrigin to prevent open redirect attacks
  const appDomain = process.env.APP_DOMAIN || 'helpportal.app';
  let tenantOrigin = authBaseUrl; // safe default
  try {
    const originUrl = new URL(rawOrigin);
    const isAllowed =
      originUrl.hostname === appDomain ||
      originUrl.hostname.endsWith(`.${appDomain}`) ||
      originUrl.hostname === 'localhost' ||
      originUrl.hostname.startsWith('localhost');
    if (isAllowed && (originUrl.protocol === 'https:' || originUrl.hostname === 'localhost')) {
      tenantOrigin = originUrl.origin;
    }
  } catch {
    // Invalid URL — use safe default
  }

  // Get code and state from query params
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  const redirectError = (msg: string) =>
    NextResponse.redirect(`${tenantOrigin}/dashboard/integrations?jira_error=${encodeURIComponent(msg)}`);

  // Handle errors from Atlassian
  if (error) {
    console.error('[Atlassian OAuth] Error from provider:', error);
    return redirectError('Access denied by Atlassian');
  }

  if (!code) {
    return redirectError('No authorization code received');
  }

  // Validate state (CSRF protection)
  if (!storedState || storedState !== state) {
    console.error('[Atlassian OAuth] State mismatch', { hasStored: !!storedState, match: storedState === state });
    return redirectError('Invalid OAuth state');
  }

  // Validate state expiration
  const stateParts = state!.split('.');
  if (stateParts.length === 2) {
    const stateTimestamp = parseInt(stateParts[1], 36);
    if (isNaN(stateTimestamp) || Date.now() - stateTimestamp > STATE_MAX_AGE_MS) {
      return redirectError('OAuth session expired');
    }
  }

  // Verify user is authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return redirectError('Not authenticated');
  }

  const session = await getSession();
  if (!session) {
    return redirectError('Session invalid');
  }

  if (!tenantId) {
    return redirectError('Missing tenant context');
  }

  // Verify the user owns this tenant
  const user = await prisma.user.findUnique({
    where: { discordId: session.id },
    include: { tenants: true },
  });

  if (!user || !user.tenants.some(t => t.id === tenantId)) {
    return redirectError('Unauthorized');
  }

  try {
    // Exchange code for tokens — redirect_uri must exactly match what's registered
    const callbackUrl = `${authBaseUrl.replace(/\/+$/, '')}/api/auth/callback/atlassian`;
    console.log('[Atlassian OAuth] Token exchange with redirect_uri:', callbackUrl);
    const tokens = await exchangeCodeForTokens(code, callbackUrl);

    // Discover accessible Jira sites
    const resources = await getAccessibleResources(tokens.access_token);
    if (resources.length === 0) {
      return redirectError('No Jira sites found. Ensure you granted access to a site.');
    }

    // Use the first site (most common case — single Jira instance)
    const site = resources[0];

    // Store encrypted tokens in TenantJiraConfig
    await prisma.tenantJiraConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        connected: true,
        authMode: 'oauth',
        cloudId: site.id,
        cloudUrl: site.url,
        accessToken: encryptToString(tokens.access_token),
        refreshToken: encryptToString(tokens.refresh_token),
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        connected: true,
        authMode: 'oauth',
        cloudId: site.id,
        cloudUrl: site.url,
        accessToken: encryptToString(tokens.access_token),
        refreshToken: encryptToString(tokens.refresh_token),
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    console.log(`[Atlassian OAuth] Connected tenant ${tenantId} to ${site.url} (cloudId: ${site.id})`);

    // Invalidate cached provider so new credentials are used immediately
    invalidateTenantProviderCache(tenantId);

    // Clear OAuth cookies
    const oauthCookieDomain = process.env.AUTH_COOKIE_DOMAIN;
    const deleteOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      ...(process.env.NODE_ENV === 'production' && oauthCookieDomain
        ? { domain: oauthCookieDomain }
        : {}),
    };

    const response = NextResponse.redirect(`${tenantOrigin}/dashboard/integrations?jira=connected`);
    response.cookies.set('jira_oauth_state', '', { ...deleteOptions, maxAge: 0 });
    response.cookies.set('jira_oauth_tenant', '', { ...deleteOptions, maxAge: 0 });
    response.cookies.set('jira_oauth_origin', '', { ...deleteOptions, maxAge: 0 });

    return response;
  } catch (err) {
    console.error('[Atlassian OAuth] Callback error:', err);
    return redirectError('Failed to connect Jira');
  }
}
