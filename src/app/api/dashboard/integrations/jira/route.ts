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

    // Get user's tenant
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

    const tenant = user.tenants[0];
    const config = tenant.jiraConfig;

    // Return status only - NEVER return credentials
    return NextResponse.json(
      {
        configured: config?.connected || false,
        hasTenant: true,
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
    if (!normalizedUrl.includes('atlassian.net')) {
      return NextResponse.json(
        { error: 'Invalid Jira URL. Expected format: yoursite.atlassian.net' },
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

    // Get user's tenant
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

    const tenant = user.tenants[0];

    // Encrypt credentials before storage
    // Store API token as accessToken (reusing OAuth field for simplicity)
    const encryptedToken = encryptToString(apiToken);

    // Upsert configuration
    await prisma.tenantJiraConfig.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        connected: true,
        cloudUrl: normalizedUrl,
        accessToken: encryptedToken,
        // Store email in refreshToken field (encrypted) - reusing available field
        refreshToken: encryptToString(email),
        serviceDeskId: serviceDeskId || null,
        projectKey: projectKey || null,
      },
      update: {
        connected: true,
        cloudUrl: normalizedUrl,
        accessToken: encryptedToken,
        refreshToken: encryptToString(email),
        serviceDeskId: serviceDeskId || null,
        projectKey: projectKey || null,
      },
    });

    console.log('[Jira Config] Configuration saved for tenant:', tenant.slug);

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

    // Get user's tenant
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

    const tenant = user.tenants[0];

    // Delete configuration
    await prisma.tenantJiraConfig.deleteMany({
      where: { tenantId: tenant.id },
    });

    console.log('[Jira Config] Configuration deleted for tenant:', tenant.slug);

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
