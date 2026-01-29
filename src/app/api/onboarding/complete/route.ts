/**
 * Complete Onboarding API
 *
 * POST /api/onboarding/complete
 *
 * Saves onboarding data and marks the user's onboarding as complete.
 * For main domain: creates a new tenant
 * For tenant subdomains: saves custom fields to TenantUser.onboardingData
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { getTenantFromRequest } from '@/lib/tenant';
import { validateCsrfRequest } from '@/lib/security/csrf';
import { Prisma } from '@/generated/prisma';
import { hasActiveAccess, syncSubscriptionWithStripe } from '@/lib/subscription/helpers';

// Security headers for API responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, private',
};

// Valid theme IDs
const VALID_THEMES = ['discord', 'dark', 'light'];

// Reserved subdomains that cannot be used
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'app', 'admin', 'dashboard', 'support', 'help',
  'mail', 'email', 'blog', 'docs', 'status', 'cdn', 'static',
  'assets', 'img', 'images', 'auth', 'login', 'signup', 'register',
  'account', 'settings', 'billing', 'checkout', 'payment', 'stripe',
  'webhook', 'webhooks', 'dev', 'staging', 'prod', 'test', 'demo',
];

// Validate subdomain format
function isValidSubdomain(subdomain: string): { valid: boolean; error?: string } {
  if (!subdomain) {
    return { valid: false, error: 'Subdomain is required' };
  }
  if (subdomain.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters' };
  }
  if (subdomain.length > 32) {
    return { valid: false, error: 'Subdomain must be 32 characters or less' };
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain) && subdomain.length > 2) {
    return { valid: false, error: 'Subdomain must start and end with a letter or number' };
  }
  if (/^[a-z0-9]$/.test(subdomain) || /^[a-z0-9]{2}$/.test(subdomain)) {
    // Allow 1-2 char subdomains if they match pattern
  } else if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
    return { valid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
  }
  if (subdomain.includes('--')) {
    return { valid: false, error: 'Subdomain cannot contain consecutive hyphens' };
  }
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return { valid: false, error: 'This subdomain is reserved' };
  }
  return { valid: true };
}

// Sanitize onboarding data to prevent XSS
function sanitizeOnboardingData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Special handling for theme - must be a valid theme ID
      if (key === 'theme') {
        if (VALID_THEMES.includes(value)) {
          sanitized[key] = value;
        }
        // Invalid theme values are silently dropped
        continue;
      }

      // Remove potential script tags and limit length
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .slice(0, 1000); // Max 1000 chars per field
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Skip other types for security
  }
  return sanitized;
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
    const { context, data } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Onboarding data is required' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Sanitize input data
    const sanitizedData = sanitizeOnboardingData(data as Record<string, unknown>);

    // Check if we're on a tenant subdomain
    const tenant = await getTenantFromRequest();

    if (tenant || context !== 'main') {
      // Tenant subdomain - save data to TenantUser
      const tenantId = tenant?.id;

      const tenantUser = await prisma.tenantUser.findUnique({
        where: {
          tenantId_discordId: {
            tenantId: tenantId || 'main',
            discordId: session.id,
          },
        },
      });

      if (!tenantUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404, headers: securityHeaders }
        );
      }

      // Save onboarding data (sanitized)
      await prisma.tenantUser.update({
        where: { id: tenantUser.id },
        data: {
          onboardingData: sanitizedData as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json(
        { success: true },
        { headers: securityHeaders }
      );
    }

    // Main domain - create a new tenant
    // First, get the main User record
    let user = await prisma.user.findUnique({
      where: { discordId: session.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: securityHeaders }
      );
    }

    // Sync with Stripe to ensure DB status is current
    if (user.subscription) {
      const synced = await syncSubscriptionWithStripe(user.subscription);
      if (synced) {
        user = await prisma.user.findUnique({
          where: { discordId: session.id },
          include: { subscription: true },
        }) || user;
      }
    }

    // Check if user has an active subscription
    if (!hasActiveAccess(user.subscription)) {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403, headers: securityHeaders }
      );
    }

    // Check if user already has a tenant
    const existingTenant = await prisma.tenant.findFirst({
      where: { ownerId: user.id },
    });

    if (existingTenant) {
      // User already has a tenant - update name and branding
      await prisma.tenant.update({
        where: { id: existingTenant.id },
        data: {
          name: (sanitizedData.portalName as string) || existingTenant.name,
        },
      });

      // Upsert branding (theme, logo, or legacy primaryColor)
      if (sanitizedData.logoUrl || sanitizedData.theme || sanitizedData.primaryColor) {
        await prisma.tenantBranding.upsert({
          where: { tenantId: existingTenant.id },
          create: {
            tenantId: existingTenant.id,
            logoUrl: sanitizedData.logoUrl as string | undefined,
            theme: sanitizedData.theme as string | undefined,
            primaryColor: sanitizedData.primaryColor as string | undefined,
          },
          update: {
            logoUrl: sanitizedData.logoUrl as string | undefined,
            theme: sanitizedData.theme as string | undefined,
            primaryColor: sanitizedData.primaryColor as string | undefined,
          },
        });
      }

      return NextResponse.json(
        {
          success: true,
          tenant: {
            id: existingTenant.id,
            slug: existingTenant.slug,
          },
        },
        { headers: securityHeaders }
      );
    }

    // Create new tenant
    const subdomain = sanitizedData.subdomain as string;

    // Validate subdomain format
    const subdomainValidation = isValidSubdomain(subdomain);
    if (!subdomainValidation.valid) {
      return NextResponse.json(
        { error: subdomainValidation.error },
        { status: 400, headers: securityHeaders }
      );
    }

    // Verify subdomain is still available
    const existingWithSlug = await prisma.tenant.findUnique({
      where: { slug: subdomain },
    });

    if (existingWithSlug) {
      return NextResponse.json(
        { error: 'Subdomain is no longer available' },
        { status: 400, headers: securityHeaders }
      );
    }

    // Create the tenant (with sanitized data)
    const newTenant = await prisma.tenant.create({
      data: {
        slug: subdomain,
        name: (sanitizedData.portalName as string) || `${subdomain} Portal`,
        ownerId: user.id,
        status: 'SETUP',
      },
    });

    // Create branding if provided (theme, logo, or legacy primaryColor)
    if (sanitizedData.logoUrl || sanitizedData.theme || sanitizedData.primaryColor) {
      await prisma.tenantBranding.create({
        data: {
          tenantId: newTenant.id,
          logoUrl: sanitizedData.logoUrl as string | undefined,
          theme: sanitizedData.theme as string | undefined,
          primaryColor: sanitizedData.primaryColor as string | undefined,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: newTenant.id,
          slug: newTenant.slug,
        },
      },
      { headers: securityHeaders }
    );
  } catch (error) {
    console.error('[Complete Onboarding] Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500, headers: securityHeaders }
    );
  }
}
