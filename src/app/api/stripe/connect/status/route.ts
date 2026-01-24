/**
 * Stripe Connect Status API
 *
 * GET /api/stripe/connect/status
 *
 * Returns the current Stripe Connect status for the authenticated user's tenant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { getConnectedAccount } from '@/lib/stripe';
import { StripeAccountStatus } from '@/generated/prisma';

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: securityHeaders });
    }

    // Get user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'User not found' }, { status: 401, headers: securityHeaders });
    }

    // Get the user and their tenant
    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: {
        tenants: {
          include: {
            stripeConfig: true,
          },
        },
      },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json({
        connected: false,
        hasTenant: false,
      }, { headers: securityHeaders });
    }

    const tenant = user.tenants[0];
    const stripeConfig = tenant.stripeConfig;

    if (!stripeConfig) {
      return NextResponse.json({
        connected: false,
        hasTenant: true,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      }, { headers: securityHeaders });
    }

    // Optionally refresh account status from Stripe
    const refreshFromStripe = request.nextUrl.searchParams.get('refresh') === 'true';

    if (refreshFromStripe && stripeConfig.stripeAccountId) {
      const account = await getConnectedAccount(stripeConfig.stripeAccountId);

      if (account) {
        let newStatus: StripeAccountStatus = StripeAccountStatus.PENDING;
        if (account.charges_enabled && account.payouts_enabled) {
          newStatus = StripeAccountStatus.ACTIVE;
        } else if (account.charges_enabled || account.details_submitted) {
          newStatus = StripeAccountStatus.CONNECTED;
        }

        // Update if changed
        if (
          newStatus !== stripeConfig.stripeAccountStatus ||
          account.charges_enabled !== stripeConfig.chargesEnabled ||
          account.payouts_enabled !== stripeConfig.payoutsEnabled
        ) {
          await prisma.tenantStripeConfig.update({
            where: { tenantId: tenant.id },
            data: {
              stripeAccountStatus: newStatus,
              chargesEnabled: account.charges_enabled || false,
              payoutsEnabled: account.payouts_enabled || false,
            },
          });
        }

        return NextResponse.json({
          connected: true,
          hasTenant: true,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          stripeAccountId: stripeConfig.stripeAccountId,
          status: newStatus,
          chargesEnabled: account.charges_enabled || false,
          payoutsEnabled: account.payouts_enabled || false,
          detailsSubmitted: account.details_submitted || false,
        }, { headers: securityHeaders });
      }
    }

    return NextResponse.json({
      connected: stripeConfig.chargesEnabled,
      hasTenant: true,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      stripeAccountId: stripeConfig.stripeAccountId,
      status: stripeConfig.stripeAccountStatus,
      chargesEnabled: stripeConfig.chargesEnabled,
      payoutsEnabled: stripeConfig.payoutsEnabled,
    }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Stripe Connect Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get Stripe Connect status' },
      { status: 500, headers: securityHeaders }
    );
  }
}
