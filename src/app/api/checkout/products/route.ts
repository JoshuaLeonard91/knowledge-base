/**
 * Checkout Products API
 *
 * GET /api/checkout/products
 *
 * Returns products available for checkout in the current context.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutProducts } from '@/lib/cms';
import { getTenantFromRequest } from '@/lib/tenant';
import { getSession, isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db/client';

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'public, max-age=60', // Cache for 1 minute (product list)
};

export async function GET(request: NextRequest) {
  try {
    // Determine context
    const tenant = await getTenantFromRequest();
    const context = tenant?.slug || 'main';

    // Get products for this context
    const products = await getCheckoutProducts(context);

    // Check if user has subscription
    let hasSubscription = false;
    let currentProductSlug: string | undefined;

    const authenticated = await isAuthenticated();
    if (authenticated) {
      const session = await getSession();
      if (session) {
        const tenantUser = await prisma.tenantUser.findUnique({
          where: {
            tenantId_discordId: {
              tenantId: tenant?.id || 'main',
              discordId: session.id,
            },
          },
          include: { subscription: true },
        });

        if (tenantUser?.subscription) {
          hasSubscription = tenantUser.subscription.status === 'ACTIVE';
          currentProductSlug = tenantUser.subscription.productSlug;
        }
      }
    }

    return NextResponse.json(
      {
        products,
        hasSubscription,
        currentProductSlug,
        context,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Checkout Products] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500, headers: securityHeaders }
    );
  }
}
