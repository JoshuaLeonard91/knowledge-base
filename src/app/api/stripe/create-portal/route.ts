/**
 * Stripe Customer Portal API
 *
 * POST /api/stripe/create-portal
 *
 * Creates a Stripe Customer Portal session for billing management.
 * Requires authenticated user with a Stripe customer ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { createPortalSession } from '@/lib/stripe/client';
import { getUserByDiscordId } from '@/lib/subscription/helpers';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate CSRF token
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      return csrfErrorResponse();
    }

    // Get user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await getUserByDiscordId(session.id);
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: 'No billing account found' },
        { status: 400 }
      );
    }

    // Get base URL — use forwarded headers to handle DO App Platform's internal reverse proxy
    const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const fwdProto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${fwdProto}://${fwdHost}`;

    // Create Stripe portal session
    // Include from_portal param so the billing page knows to refresh data
    const portalSession = await createPortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: `${baseUrl}/dashboard/billing?from_portal=true`,
    });

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    });
  } catch (error) {
    console.error('[Stripe Portal] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
