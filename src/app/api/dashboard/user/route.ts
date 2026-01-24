/**
 * Dashboard User API
 *
 * GET /api/dashboard/user
 *
 * Returns current user data for dashboard (tenant subdomain).
 * Includes TenantUser and TenantSubscription info.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { getTenantFromRequest } from '@/lib/tenant';

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private', // Don't cache sensitive user data
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Get user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401, headers: securityHeaders }
      );
    }

    // Get tenant context
    const tenant = await getTenantFromRequest();
    if (!tenant) {
      // Main domain - return basic user info
      const user = await prisma.user.findUnique({
        where: { discordId: session.id },
      });

      return NextResponse.json(
        {
          user: user ? {
            id: user.id,
            username: user.discordUsername,
            avatar: user.discordAvatar,
            email: user.email,
          } : null,
          subscription: null,
        },
        { headers: securityHeaders }
      );
    }

    // Tenant subdomain - get TenantUser and TenantSubscription
    const tenantUser = await prisma.tenantUser.findUnique({
      where: {
        tenantId_discordId: {
          tenantId: tenant.id,
          discordId: session.id,
        },
      },
      include: {
        subscription: true,
      },
    });

    if (!tenantUser) {
      return NextResponse.json(
        { user: null, subscription: null },
        { headers: securityHeaders }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: tenantUser.id,
          username: tenantUser.discordUsername,
          avatar: tenantUser.discordAvatar,
          email: tenantUser.email,
          onboardingData: tenantUser.onboardingData,
        },
        subscription: tenantUser.subscription ? {
          id: tenantUser.subscription.id,
          status: tenantUser.subscription.status,
          productSlug: tenantUser.subscription.productSlug,
          productName: tenantUser.subscription.productSlug,
          price: 0,
          currentPeriodStart: tenantUser.subscription.currentPeriodStart,
          currentPeriodEnd: tenantUser.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: tenantUser.subscription.cancelAtPeriodEnd,
        } : null,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Dashboard User] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500, headers: securityHeaders }
    );
  }
}
