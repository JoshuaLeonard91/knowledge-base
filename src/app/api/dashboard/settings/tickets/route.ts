/**
 * Ticket Form Settings API
 *
 * GET   - Returns current tenant ticket form field visibility
 * PATCH - Updates ticket form field visibility settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireTenantOwner, securityHeaders } from '@/lib/api/auth';
import { prisma } from '@/lib/db/client';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

/**
 * GET - Return current tenant ticket form settings
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if ('response' in auth) return auth.response;
    const { session } = auth;

    const tenantContext = await getTenantFromRequest();

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        tenants: {
          include: { features: true },
        },
      },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { showServerIdField: false, showDiscordUserIdField: false },
        { headers: securityHeaders }
      );
    }

    const tenant = tenantContext
      ? user.tenants.find((t) => t.slug === tenantContext.slug)
      : user.tenants[0];

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant access denied' },
        { status: 403, headers: securityHeaders }
      );
    }

    return NextResponse.json(
      {
        showServerIdField: tenant.features?.showServerIdField ?? false,
        showDiscordUserIdField: tenant.features?.showDiscordUserIdField ?? false,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Ticket Settings] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get ticket settings' },
      { status: 500, headers: securityHeaders }
    );
  }
}

/**
 * PATCH - Update tenant ticket form settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireTenantOwner(request);
    if ('response' in auth) return auth.response;
    const { tenant } = auth;

    const body = await request.json();
    const { showServerIdField, showDiscordUserIdField } = body;

    // Validate: at least one boolean field must be present
    if (typeof showServerIdField !== 'boolean' && typeof showDiscordUserIdField !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid settings' },
        { status: 400, headers: securityHeaders }
      );
    }

    const updateData: Record<string, boolean> = {};
    if (typeof showServerIdField === 'boolean') updateData.showServerIdField = showServerIdField;
    if (typeof showDiscordUserIdField === 'boolean') updateData.showDiscordUserIdField = showDiscordUserIdField;

    await prisma.tenantFeatures.upsert({
      where: { tenantId: tenant.id },
      create: { tenantId: tenant.id, ...updateData },
      update: updateData,
    });

    return NextResponse.json(
      { success: true, ...updateData },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Ticket Settings] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket settings' },
      { status: 500, headers: securityHeaders }
    );
  }
}
