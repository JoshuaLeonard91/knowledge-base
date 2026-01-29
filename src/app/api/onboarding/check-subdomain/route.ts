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
import { getUserByDiscordId, hasActiveAccess, syncSubscriptionWithStripe } from '@/lib/subscription/helpers';
import { prisma } from '@/lib/db/client';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

// Reserved subdomains that can't be used
const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'smtp',
  'ftp',
  'blog',
  'shop',
  'store',
  'support',
  'help',
  'docs',
  'status',
  'cdn',
  'assets',
  'static',
  'media',
  'images',
  'staging',
  'dev',
  'test',
  'demo',
  'portal',
  'dashboard',
  'billing',
  'account',
  'login',
  'signup',
  'register',
  'auth',
];

// Subdomain validation regex
const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// GET handler for quick subdomain availability check (used by onboarding wizard)
export async function GET(request: NextRequest) {
  try {
    const subdomain = request.nextUrl.searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json({ available: false, message: 'Subdomain is required' }, { headers: securityHeaders });
    }

    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Validate format
    if (!SUBDOMAIN_REGEX.test(normalizedSubdomain)) {
      return NextResponse.json({
        available: false,
        message: 'Invalid format. Use lowercase letters, numbers, and hyphens.',
      }, { headers: securityHeaders });
    }

    // Check length
    if (normalizedSubdomain.length < 3 || normalizedSubdomain.length > 63) {
      return NextResponse.json({
        available: false,
        message: 'Subdomain must be 3-63 characters.',
      }, { headers: securityHeaders });
    }

    // Check reserved
    if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
      return NextResponse.json({
        available: false,
        message: 'This subdomain is reserved.',
      }, { headers: securityHeaders });
    }

    // Check if taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: normalizedSubdomain },
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
    let user = await getUserByDiscordId(session.id);
    // Sync with Stripe to ensure DB status is current
    if (user?.subscription) {
      const synced = await syncSubscriptionWithStripe(user.subscription);
      if (synced) {
        user = await getUserByDiscordId(session.id);
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

    if (!subdomain || typeof subdomain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Subdomain is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Normalize subdomain
    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Validate format
    if (!SUBDOMAIN_REGEX.test(normalizedSubdomain)) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Invalid format. Use only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.',
      }, { headers: securityHeaders });
    }

    // Check minimum length
    if (normalizedSubdomain.length < 3) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Subdomain must be at least 3 characters long.',
      }, { headers: securityHeaders });
    }

    // Check maximum length
    if (normalizedSubdomain.length > 63) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Subdomain must be no more than 63 characters long.',
      }, { headers: securityHeaders });
    }

    // Check reserved subdomains
    if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'This subdomain is reserved and cannot be used.',
      }, { headers: securityHeaders });
    }

    // Check if subdomain is already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: normalizedSubdomain },
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
      subdomain: normalizedSubdomain,
    }, { headers: securityHeaders });
  } catch (error) {
    console.error('[Check Subdomain] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check subdomain availability' },
      { status: 500, headers: securityHeaders }
    );
  }
}
