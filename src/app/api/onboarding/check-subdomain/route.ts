/**
 * Check Subdomain Availability API
 *
 * POST /api/onboarding/check-subdomain
 *
 * Checks if a subdomain is available for a new tenant.
 * Requires authenticated user with active subscription.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { getUserById, hasActiveAccess, syncSubscriptionWithStripe } from '@/lib/subscription/helpers';
import { prisma } from '@/lib/db/client';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';
import { validateSubdomain } from '@/lib/validation';

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

// GET handler for quick subdomain availability check (used by onboarding wizard)
export async function GET(request: NextRequest) {
  try {
    // Require authentication to prevent unauthenticated subdomain enumeration
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { available: false, message: 'Authentication required' },
        { status: 401, headers: securityHeaders }
      );
    }

    const subdomain = request.nextUrl.searchParams.get('subdomain');

    // Validate format, length, reserved words, profanity
    const validation = validateSubdomain(subdomain);
    if (!validation.valid) {
      return NextResponse.json({ available: false, message: validation.error }, { headers: securityHeaders });
    }

    // Check if taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: validation.normalized },
    });

    if (existingTenant) {
      return NextResponse.json({
        available: false,
        message: 'This subdomain is already taken.',
      }, { headers: securityHeaders });
    }

    return NextResponse.json({ available: true }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Check Subdomain GET] Error:', error);
    return NextResponse.json({ available: false, message: 'Error checking availability' }, { headers: securityHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401, headers: securityHeaders }
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
        { status: 401, headers: securityHeaders }
      );
    }

    // Get user from database and verify subscription
    let user = await getUserById(session.id);
    // Sync with Stripe to ensure DB status is current
    if (user?.subscription) {
      const synced = await syncSubscriptionWithStripe(user.subscription);
      if (synced) {
        user = await getUserById(session.id);
      }
    }
    if (!user || !hasActiveAccess(user.subscription)) {
      return NextResponse.json(
        { success: false, error: 'Active subscription required' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Get subdomain from request body
    const body = await request.json();
    const { subdomain } = body;

    // Validate format, length, reserved words, profanity
    const validation = validateSubdomain(subdomain);
    if (!validation.valid) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: validation.error,
      }, { headers: securityHeaders });
    }

    // Check if subdomain is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: validation.normalized },
    });

    if (existingTenant) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'This subdomain is already taken.',
      }, { headers: securityHeaders });
    }

    return NextResponse.json({
      success: true,
      available: true,
      subdomain: validation.normalized,
    }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Check Subdomain] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check subdomain availability' },
      { status: 500, headers: securityHeaders }
    );
  }
}
