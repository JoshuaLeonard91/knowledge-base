/**
 * Jira Integration API
 *
 * GET  - Returns configured status only (no credentials)
 * POST - Creates/updates config (validates → encrypts → stores)
 * DELETE - Removes config
 *
 * Security:
 * - Only tenant owner can access
 * - Credentials are encrypted before storage
 * - Credentials are NEVER returned to client
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { encryptToString } from '@/lib/security/crypto';
import { validateCsrfRequest } from '@/lib/security/csrf';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { revokeToken } from '@/lib/atlassian/oauth';
import { invalidateTenantProviderCache } from '@/lib/ticketing/adapter';

// Security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

/**
 * GET - Return configuration status only
 */
export async function GET() {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Get tenant from request context (validates subdomain)
    const tenantContext = await getTenantFromRequest();

    // Get user's tenant and validate against request context
    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: {
        tenants: {
          include: {
            jiraConfig: true,
          },
        },
      },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { configured: false, hasTenant: false },
        { headers: securityHeaders }
      );
    }

    // Find the tenant matching the current request context
    const tenant = tenantContext
      ? user.tenants.find(t => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant access denied' },
        { status: 403, headers: securityHeaders }
      );
    }

    const config = tenant.jiraConfig;

    // Return status and onboarding progress — NEVER return credentials
    return NextResponse.json(
      {
        configured: config?.connected || false,
        hasTenant: true,
        authMode: config?.authMode || 'api_token',
        cloudUrl: config?.cloudUrl || null,
        projectKey: config?.projectKey || null,
        projectId: config?.projectId || null,
        serviceDeskId: config?.serviceDeskId || null,
        requestTypeId: config?.requestTypeId || null,
        automationRuleCreated: config?.automationRuleCreated || false,
        connectedAt: config?.createdAt || null,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Jira Config] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}

/**
 * POST - Create or update Jira configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Validate CSRF
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Parse body
    const body = await request.json();
    const { jiraUrl, email, apiToken, serviceDeskId, projectKey } = body;

    // Validate inputs
    if (!jiraUrl || typeof jiraUrl !== 'string') {
      return NextResponse.json(
        { error: 'Jira URL is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate URL format - should be like acme.atlassian.net or https://acme.atlassian.net
    let normalizedUrl = jiraUrl.trim();
    if (!normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try {
      const parsed = new URL(normalizedUrl);
      if (!parsed.hostname.endsWith('.atlassian.net')) {
        return NextResponse.json(
          { error: 'Invalid Jira URL. Expected format: yoursite.atlassian.net' },
          { status: 400, headers: securityHeaders }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate email format
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Get tenant from request context (validates subdomain)
    const tenantContext = await getTenantFromRequest();

    // Get user's tenant and validate against request context
    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404, headers: securityHeaders }
      );
    }

    // Find the tenant matching the current request context
    const tenant = tenantContext
      ? user.tenants.find(t => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant access denied' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Encrypt credentials before storage
    // TODO (H9): Add proper jiraEmail and jiraApiToken fields to TenantJiraConfig schema
    // Currently reusing accessToken/refreshToken fields — schema migration needed
    const encryptedToken = encryptToString(apiToken);

    // Upsert configuration
    await prisma.tenantJiraConfig.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        connected: true,
        authMode: 'api_token',
        cloudUrl: normalizedUrl,
        accessToken: encryptedToken,
        // Store email in refreshToken field (encrypted) - reusing available field
        refreshToken: encryptToString(email),
        serviceDeskId: serviceDeskId || null,
        projectKey: projectKey || null,
      },
      update: {
        connected: true,
        authMode: 'api_token',
        cloudUrl: normalizedUrl,
        accessToken: encryptedToken,
        refreshToken: encryptToString(email),
        serviceDeskId: serviceDeskId || null,
        projectKey: projectKey || null,
      },
    });

    // Invalidate cached provider so new credentials are used immediately
    invalidateTenantProviderCache(tenant.id);

    console.log('[Jira Config] Configuration saved');

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Jira Config] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}

/**
 * DELETE - Remove Jira configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate CSRF
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Get tenant from request context (validates subdomain)
    const tenantContext = await getTenantFromRequest();

    // Get user's tenant and validate against request context
    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { tenants: true },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 404, headers: securityHeaders }
      );
    }

    // Find the tenant matching the current request context
    const tenant = tenantContext
      ? user.tenants.find(t => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant access denied' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Revoke OAuth token if using OAuth mode
    const existingConfig = await prisma.tenantJiraConfig.findUnique({
      where: { tenantId: tenant.id },
    });
    if (existingConfig?.authMode === 'oauth' && existingConfig.refreshToken) {
      await revokeToken(existingConfig.refreshToken);
    }

    // Delete configuration
    await prisma.tenantJiraConfig.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Invalidate cached provider
    invalidateTenantProviderCache(tenant.id);

    console.log('[Jira Config] Configuration deleted');

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Jira Config] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}
