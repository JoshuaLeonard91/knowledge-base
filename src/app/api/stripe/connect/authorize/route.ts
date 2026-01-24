/**
 * Stripe Connect Authorize API
 *
 * GET /api/stripe/connect/authorize
 *
 * Initiates the Stripe Connect OAuth flow for tenant owners.
 * Allows tenants to connect their own Stripe account to receive payments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { getStripeConnectOAuthUrl } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get user session
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get the user and their tenant
    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: {
        tenants: true,
      },
    });

    if (!user || user.tenants.length === 0) {
      return NextResponse.json(
        { error: 'You must have a tenant to connect Stripe' },
        { status: 403 }
      );
    }

    // Get the first tenant (users typically own one tenant)
    const tenant = user.tenants[0];

    // Check if already connected
    const existingConfig = await prisma.tenantStripeConfig.findUnique({
      where: { tenantId: tenant.id },
    });

    if (existingConfig?.chargesEnabled) {
      return NextResponse.redirect(new URL('/dashboard/payments?already_connected=true', request.url));
    }

    // Get return URL from query params or default
    // SECURITY: Only allow relative paths to prevent open redirect
    let returnUrl = request.nextUrl.searchParams.get('return_url') || '/dashboard/payments';

    // Validate return URL is a safe relative path
    if (!returnUrl.startsWith('/') || returnUrl.startsWith('//') || returnUrl.includes('://')) {
      returnUrl = '/dashboard/payments';
    }

    // Generate OAuth URL with session ID for extra security
    const oauthUrl = getStripeConnectOAuthUrl(tenant.id, returnUrl, session.id);

    return NextResponse.redirect(oauthUrl);
  } catch (error) {
    console.error('[Stripe Connect Authorize] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Stripe Connect' },
      { status: 500 }
    );
  }
}
