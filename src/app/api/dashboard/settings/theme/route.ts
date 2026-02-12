/**
 * Theme Settings API
 *
 * GET   - Returns current tenant theme
 * PATCH - Updates tenant theme (validates against allowlist)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { isValidTheme } from '@/lib/themes';

/**
 * GET - Return current tenant theme
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if ('response' in auth) return auth.response;
    const { session } = auth;

    const tenantContext = await getTenantFromRequest();

    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: {
        tenants: {
          include: { branding: true },
        },
      },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { theme: 'dark' },
        { headers: securityHeaders }
      );
    }

    const tenant = tenantContext
      ? user.tenants.find((t) => t.slug === tenantContext.slug) || user.tenants[0]
      : user.tenants[0];

    return NextResponse.json(
      { theme: tenant.branding?.theme || 'dark' },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Theme Settings] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get theme' },
      { status: 500, headers: securityHeaders }
    );
  }
}

/**
 * PATCH - Update tenant theme
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    const body = await request.json();
    const { theme } = body;

    if (!theme || typeof theme !== 'string' || !isValidTheme(theme)) {
      return NextResponse.json(
        { error: 'Invalid theme' },
        { status: 400, headers: securityHeaders }
      );
    }

    await prisma.tenantBranding.upsert({
      where: { tenantId: tenant.id },
      create: { tenantId: tenant.id, theme },
      update: { theme },
    });

    return NextResponse.json(
      { success: true, theme },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Theme Settings] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500, headers: securityHeaders }
    );
  }
}
