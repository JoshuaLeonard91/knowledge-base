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
import { getUserByDiscordId, hasActiveAccess } from '@/lib/subscription/helpers';
import { prisma } from '@/lib/db/client';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';

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

    // Get user from database and verify subscription
    const user = await getUserByDiscordId(session.id);
    if (!user || !hasActiveAccess(user.subscription)) {
      return NextResponse.json(
        { success: false, error: 'Active subscription required' },
        { status: 403 }
      );
    }

    // Get subdomain from request body
    const body = await request.json();
    const { subdomain } = body;

    if (!subdomain || typeof subdomain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Subdomain is required' },
        { status: 400 }
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
      });
    }

    // Check minimum length
    if (normalizedSubdomain.length < 3) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Subdomain must be at least 3 characters long.',
      });
    }

    // Check maximum length
    if (normalizedSubdomain.length > 63) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Subdomain must be no more than 63 characters long.',
      });
    }

    // Check reserved subdomains
    if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'This subdomain is reserved and cannot be used.',
      });
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
      });
    }

    return NextResponse.json({
      success: true,
      available: true,
      subdomain: normalizedSubdomain,
    });
  } catch (error) {
    console.error('[Check Subdomain] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check subdomain availability' },
      { status: 500 }
    );
  }
}
