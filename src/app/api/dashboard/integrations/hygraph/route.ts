/**
 * Hygraph Integration API
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

    const tenant = user.tenants[0];
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

    console.log('[Hygraph Config] Configuration saved for tenant:', tenant.slug);

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
    await prisma.tenantHygraphConfig.deleteMany({
      where: { tenantId: tenant.id },
    });

    console.log('[Hygraph Config] Configuration deleted for tenant:', tenant.slug);

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
