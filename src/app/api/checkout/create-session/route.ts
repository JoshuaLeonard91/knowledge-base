/**
 * Checkout Session API
 *
 * POST /api/checkout/create-session
 *
 * Creates a Stripe Checkout session for main domain only.
 * Tenant subdomains use external Payment Links configured in CMS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { createGenericCheckoutSession } from '@/lib/stripe';
import { prisma } from '@/lib/db/client';
import { getTenantFromRequest } from '@/lib/tenant';
import { validateCsrfRequest } from '@/lib/security/csrf';

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

// Main domain product (configured via env vars)
// Single product for the platform subscription
const MAIN_DOMAIN_PRODUCT = {
  slug: 'pro',
  name: 'Pro',
  priceAmount: 500, // $5.00 in cents
  stripePriceId: process.env.STRIPE_PRICE_ID,
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

    // Check if we're on a tenant subdomain
    const tenant = await getTenantFromRequest();
    if (tenant) {
      // Tenant subdomains use external Payment Links, not API checkout
      return NextResponse.json(
        { error: 'Checkout not available. Please use the payment link.', code: 'USE_PAYMENT_LINK' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Parse request body
    const body = await request.json();
    const { productSlug } = body;

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

    // Main domain only supports the Pro product
    if (productSlug !== MAIN_DOMAIN_PRODUCT.slug) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: securityHeaders }
      );
    }

    const product = MAIN_DOMAIN_PRODUCT;

    // Get or create TenantUser for main domain (tenantId = null)
    // Note: Can't use findUnique with null in composite key, use findFirst instead
    let tenantUser = await prisma.tenantUser.findFirst({
      where: {
        tenantId: null,
        discordId: session.id,
      },
    });

    if (!tenantUser) {
      tenantUser = await prisma.tenantUser.create({
        data: {
          tenantId: null,
          discordId: session.id,
          discordUsername: session.username,
          discordAvatar: session.avatar,
          // Email will be collected during Stripe checkout
        },
      });
    }

    // Check if user already has an active subscription (on User model for main domain)
    const user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { subscription: true },
    });

    if (user?.subscription) {
      const { status } = user.subscription;
      if (status === 'ACTIVE' || status === 'PAST_DUE') {
        return NextResponse.json(
          { error: 'You already have an active subscription', code: 'ALREADY_SUBSCRIBED' },
          { status: 400, headers: securityHeaders }
        );
      }
    }

    // Get base URL — use forwarded headers to handle DO App Platform's internal reverse proxy
    const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const fwdProto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${fwdProto}://${fwdHost}`;

    // Create Stripe checkout session
    const checkoutSession = await createGenericCheckoutSession({
      productSlug: product.slug,
      priceId: product.stripePriceId,
      priceAmount: product.priceAmount,
      productName: product.name,
      userId: tenantUser.id,
      userEmail: tenantUser.email,
      context: 'main',
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
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
