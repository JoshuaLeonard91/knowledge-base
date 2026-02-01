/**
 * Zendesk Integration API
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

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

/**
 * GET - Return configuration status only
 */
export async function GET() {
  try {
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

    const tenantContext = await getTenantFromRequest();

    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: {
        tenants: {
          include: {
            zendeskConfig: true,
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

    const tenant = tenantContext
      ? user.tenants.find(t => t.slug === tenantContext.slug) || user.tenants[0]
      : user.tenants[0];
    const config = tenant.zendeskConfig;

    return NextResponse.json(
      {
        configured: config?.connected || false,
        hasTenant: true,
        connectedAt: config?.createdAt || null,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Zendesk Config] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}

/**
 * POST - Create or update Zendesk configuration
 */
export async function POST(request: NextRequest) {
  try {
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

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

    const body = await request.json();
    const { subdomain, email, apiToken, groupId } = body;

    // Validate inputs
    if (!subdomain || typeof subdomain !== 'string') {
      return NextResponse.json(
        { error: 'Zendesk subdomain is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!apiToken || typeof apiToken !== 'string') {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Normalize subdomain (strip .zendesk.com if provided)
    const normalizedSubdomain = subdomain
      .trim()
      .toLowerCase()
      .replace(/\.zendesk\.com$/, '')
      .replace(/^https?:\/\//, '');

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(normalizedSubdomain)) {
      return NextResponse.json(
        { error: 'Invalid Zendesk subdomain format' },
        { status: 400, headers: securityHeaders }
      );
    }

    const tenantContext = await getTenantFromRequest();

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

    const tenant = tenantContext
      ? user.tenants.find(t => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant access denied' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Encrypt credentials
    const encryptedEmail = encryptToString(email);
    const encryptedToken = encryptToString(apiToken);

    await prisma.tenantZendeskConfig.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        connected: true,
        subdomain: normalizedSubdomain,
        email: encryptedEmail,
        apiToken: encryptedToken,
        groupId: groupId || null,
      },
      update: {
        connected: true,
        subdomain: normalizedSubdomain,
        email: encryptedEmail,
        apiToken: encryptedToken,
        groupId: groupId || null,
      },
    });

    // Also set the tenant's ticket provider to ZENDESK
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { ticketProvider: 'ZENDESK' },
    });

    console.log('[Zendesk Config] Configuration saved');

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Zendesk Config] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}

/**
 * DELETE - Remove Zendesk configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403, headers: securityHeaders }
      );
    }

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

    const tenantContext = await getTenantFromRequest();

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

    const tenant = tenantContext
      ? user.tenants.find(t => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant access denied' },
        { status: 403, headers: securityHeaders }
      );
    }

    await prisma.tenantZendeskConfig.deleteMany({
      where: { tenantId: tenant.id },
    });

    // Clear ticket provider if it was Zendesk
    if (tenant.ticketProvider === 'ZENDESK') {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { ticketProvider: null },
      });
    }

    console.log('[Zendesk Config] Configuration deleted');

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Zendesk Config] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}
