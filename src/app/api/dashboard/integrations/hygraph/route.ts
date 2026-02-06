/**
 * Hygraph Integration API
 *
 * GET  - Returns configured status only (no credentials)
 * POST - Creates/updates config (validates -> encrypts -> stores)
 * DELETE - Removes config
 *
 * Security:
 * - Only tenant owner can access
 * - Credentials are encrypted before storage
 * - Credentials are NEVER returned to client
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { encryptToString } from '@/lib/security/crypto';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

/**
 * GET - Return configuration status only
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if ('response' in auth) return auth.response;
    const { session } = auth;

    // Get tenant from request context (validates subdomain)
    const tenantContext = await getTenantFromRequest();

    // Get user's tenant and validate against request context
    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: {
        tenants: {
          include: {
            hygraphConfig: true,
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
      ? user.tenants.find(t => t.slug === tenantContext.slug) || user.tenants[0]
      : user.tenants[0];
    const config = tenant.hygraphConfig;

    // Return status only - NEVER return credentials
    return NextResponse.json(
      {
        configured: !!config,
        hasTenant: true,
        connectedAt: config?.createdAt || null,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Hygraph Config] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}

/**
 * POST - Create or update Hygraph configuration
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    // Parse body
    const body = await request.json();
    const { endpoint, token } = body;

    // Validate inputs
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate endpoint format
    if (!endpoint.startsWith('https://') || !endpoint.includes('hygraph.com')) {
      return NextResponse.json(
        { error: 'Invalid Hygraph endpoint URL' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Encrypt credentials before storage
    const encryptedEndpoint = encryptToString(endpoint);
    const encryptedToken = encryptToString(token);

    // Upsert configuration
    await prisma.tenantHygraphConfig.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        endpoint: encryptedEndpoint,
        token: encryptedToken,
      },
      update: {
        endpoint: encryptedEndpoint,
        token: encryptedToken,
      },
    });

    console.log('[Hygraph Config] Configuration saved');

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Hygraph Config] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}

/**
 * DELETE - Remove Hygraph configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    // Delete configuration
    await prisma.tenantHygraphConfig.deleteMany({
      where: { tenantId: tenant.id },
    });

    console.log('[Hygraph Config] Configuration deleted');

    return NextResponse.json(
      { success: true },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Hygraph Config] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete configuration' },
      { status: 500, headers: securityHeaders }
    );
  }
}
