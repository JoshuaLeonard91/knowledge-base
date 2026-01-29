/**
 * Create Tenant API
 *
 * POST /api/onboarding/create-tenant
 *
 * Creates a new tenant with the specified subdomain and branding.
 * Requires authenticated user with active subscription and no existing tenant.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { getUserByDiscordId, hasActiveAccess, syncSubscriptionWithStripe } from '@/lib/subscription/helpers';
import { prisma } from '@/lib/db/client';
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';
import { TenantStatus, TenantPlan } from '@/generated/prisma';
import crypto from 'crypto';

// Reserved subdomains that can't be used
const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'admin', 'mail', 'smtp', 'ftp', 'blog',
  'shop', 'store', 'support', 'help', 'docs', 'status', 'cdn',
  'assets', 'static', 'media', 'images', 'staging', 'dev', 'test',
  'demo', 'portal', 'dashboard', 'billing', 'account', 'login',
  'signup', 'register', 'auth',
];

// Subdomain validation regex
const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// Hex color validation regex
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

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
        { status: 403 }
      );
    }

    // Check if user already has a tenant
    if (user.tenants.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have a portal', code: 'ALREADY_HAS_TENANT' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { subdomain, displayName, logoUrl, primaryColor } = body;

    // Validate subdomain
    if (!subdomain || typeof subdomain !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    const normalizedSubdomain = subdomain.toLowerCase().trim();

    if (!SUBDOMAIN_REGEX.test(normalizedSubdomain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid subdomain format' },
        { status: 400 }
      );
    }

    if (normalizedSubdomain.length < 3 || normalizedSubdomain.length > 63) {
      return NextResponse.json(
        { success: false, error: 'Subdomain must be 3-63 characters' },
        { status: 400 }
      );
    }

    if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
      return NextResponse.json(
        { success: false, error: 'This subdomain is reserved' },
        { status: 400 }
      );
    }

    // Check if subdomain is taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: normalizedSubdomain },
    });

    if (existingTenant) {
      return NextResponse.json(
        { success: false, error: 'This subdomain is already taken' },
        { status: 400 }
      );
    }

    // Validate display name
    const name = displayName?.trim() || `${normalizedSubdomain} Support`;
    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Display name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Validate primary color if provided
    if (primaryColor && !HEX_COLOR_REGEX.test(primaryColor)) {
      return NextResponse.json(
        { success: false, error: 'Invalid color format. Use hex format (e.g., #FF5733)' },
        { status: 400 }
      );
    }

    // Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    // Create tenant with related records
    const tenant = await prisma.tenant.create({
      data: {
        slug: normalizedSubdomain,
        name,
        status: TenantStatus.ACTIVE,
        plan: TenantPlan.PRO, // All paid users get PRO
        ownerId: user.id,
        branding: {
          create: {
            logoUrl: logoUrl || null,
            primaryColor: primaryColor || null,
          },
        },
        features: {
          create: {
            articlesEnabled: true,
            servicesEnabled: true,
            ticketsEnabled: true,
            discordLoginEnabled: true,
            tipsEnabled: false,
          },
        },
        webhookConfig: {
          create: {
            webhookSecret,
            webhookEnabled: true,
          },
        },
      },
      include: {
        branding: true,
        features: true,
      },
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        plan: tenant.plan,
        branding: tenant.branding,
        features: tenant.features,
      },
    });
  } catch (error) {
    console.error('[Create Tenant] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create portal' },
      { status: 500 }
    );
  }
}
