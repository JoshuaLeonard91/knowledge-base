/**
 * Tenant Info API
 *
 * GET /api/tenant - Returns current tenant public info
 *
 * SECURITY: Only returns public information needed for the client.
 * Does NOT expose:
 * - Internal IDs
 * - Service configuration status (hygraph, jira details)
 * - Custom domains
 * - Any tokens or secrets
 */

import { NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenant';

export async function GET() {
  try {
    const tenant = await getTenantFromRequest();

    if (!tenant) {
      // Generic error - don't reveal if tenant exists or not
      return NextResponse.json({
        success: false,
        error: 'Tenant not found',
      }, { status: 404 });
    }

    // Return ONLY public tenant info - no internal IDs or service status
    return NextResponse.json({
      success: true,
      tenant: {
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        features: {
          articlesEnabled: tenant.features.articlesEnabled,
          servicesEnabled: tenant.features.servicesEnabled,
          ticketsEnabled: tenant.features.ticketsEnabled,
          discordLoginEnabled: tenant.features.discordLoginEnabled,
        },
        branding: tenant.branding ? {
          logoUrl: tenant.branding.logoUrl,
          primaryColor: tenant.branding.primaryColor,
        } : null,
      },
    });
  } catch {
    // Generic error - don't expose internal details
    return NextResponse.json({
      success: false,
      error: 'An error occurred',
    }, { status: 500 });
  }
}
