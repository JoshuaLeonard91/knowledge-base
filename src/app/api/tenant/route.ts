/**
 * Tenant Info API (for testing/debugging)
 *
 * GET /api/tenant - Returns current tenant info based on subdomain/query param
 *
 * Test locally: http://localhost:3000/api/tenant?tenant=demo
 * Test production: https://demo.helpportal.app/api/tenant
 */

import { NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenant';

export async function GET() {
  try {
    const tenant = await getTenantFromRequest();

    if (!tenant) {
      return NextResponse.json({
        success: false,
        error: 'No tenant found',
        hint: 'Use ?tenant=demo locally or visit demo.yourdomain.com',
      }, { status: 404 });
    }

    // Return tenant info (safe data only, no secrets)
    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        plan: tenant.plan,
        features: tenant.features,
        branding: tenant.branding,
        hygraphConfigured: !!tenant.hygraph,
        jiraConnected: tenant.jira?.connected ?? false,
      },
    });
  } catch (error) {
    console.error('[API/Tenant] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to resolve tenant',
    }, { status: 500 });
  }
}
