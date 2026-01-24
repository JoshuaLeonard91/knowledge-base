/**
 * Unified Checkout Session API
 *
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout session for any context (main domain or tenant).
 * ALL payments go through Stripe Connect:
 * - Main domain: Uses PLATFORM_STRIPE_ACCOUNT_ID
 * - Tenant: Uses tenant's connected account (TenantStripeConfig)
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { createGenericCheckoutSession } from '@/lib/stripe';
import { getCheckoutProducts } from '@/lib/cms';
import { prisma } from '@/lib/db/client';
import { getTenantFromRequest } from '@/lib/tenant';
import { validateCsrfRequest } from '@/lib/security/csrf';

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

// Validate product slug format
function isValidProductSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(slug);
}

export async function POST(request: NextRequest) {
  try {
    // Verify CSRF token
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'CSRF_INVALID' },
        { status: 403, headers: securityHeaders }
      );
    }

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

    // Parse request body
    const body = await request.json();
    const { productSlug, context: requestContext } = body;

    if (!productSlug || typeof productSlug !== 'string') {
      return NextResponse.json(
        { error: 'Product slug is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate product slug format
    if (!isValidProductSlug(productSlug)) {
      return NextResponse.json(
        { error: 'Invalid product slug' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Determine context and connected account
    let context = requestContext || 'main';
    let connectedAccountId: string | undefined;
    let tenantId: string | undefined;

    // Check if we're on a tenant subdomain
    const tenant = await getTenantFromRequest();

    if (tenant) {
      // Tenant subdomain - use tenant's connected Stripe account
      context = tenant.slug;
      tenantId = tenant.id;

      // Get tenant's Stripe Connect config
      const stripeConfig = await prisma.tenantStripeConfig.findUnique({
        where: { tenantId: tenant.id },
      });

      if (!stripeConfig?.chargesEnabled) {
        // Tenant hasn't connected Stripe - payments not available
        return NextResponse.json(
          { error: 'Payments are not enabled for this portal', code: 'PAYMENTS_DISABLED' },
          { status: 400, headers: securityHeaders }
        );
      }

      connectedAccountId = stripeConfig.stripeAccountId;
    } else {
      // Main domain - use platform's Stripe account via Connect
      // If PLATFORM_STRIPE_ACCOUNT_ID is set, use it for unified Connect flow
      // If not set, falls back to direct platform account (no Connect)
      connectedAccountId = process.env.PLATFORM_STRIPE_ACCOUNT_ID;
    }

    // Get products for this context
    const products = await getCheckoutProducts(context);
    const product = products.find((p) => p.slug === productSlug);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: securityHeaders }
      );
    }

    // Get or create TenantUser for this context
    let tenantUser = await prisma.tenantUser.findUnique({
      where: {
        tenantId_discordId: {
          tenantId: tenantId || 'main',
          discordId: session.id,
        },
      },
    });

    if (!tenantUser) {
      tenantUser = await prisma.tenantUser.create({
        data: {
          tenantId: tenantId || null,
          discordId: session.id,
          discordUsername: session.username,
          discordAvatar: session.avatar,
          // Email will be collected during Stripe checkout
        },
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.tenantSubscription.findUnique({
      where: { tenantUserId: tenantUser.id },
    });

    if (existingSubscription) {
      const { status } = existingSubscription;
      if (status === 'ACTIVE' || status === 'PAST_DUE') {
        return NextResponse.json(
          { error: 'You already have an active subscription', code: 'ALREADY_SUBSCRIBED' },
          { status: 400, headers: securityHeaders }
        );
      }
    }

    // Get base URL
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev
      ? `${request.nextUrl.protocol}//${request.nextUrl.host}`
      : (process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`);

    // Create Stripe checkout session
    const checkoutSession = await createGenericCheckoutSession({
      productSlug: product.slug,
      priceId: product.stripePriceId,
      priceAmount: product.priceAmount,
      productName: product.name,
      userId: tenantUser.id,
      userEmail: tenantUser.email,
      context,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
      connectedAccountId,
      isMainDomain: !tenant, // True if main domain, false if tenant
    });

    return NextResponse.json(
      {
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500, headers: securityHeaders }
    );
  }
}
