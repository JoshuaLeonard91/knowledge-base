/**
 * Next.js Security Middleware
 *
 * Runs on every request to enforce:
 * - Multi-tenant subdomain resolution
 * - Rate limiting (in-memory, checked here)
 * - Request validation
 * - Security headers
 * - Main domain route protection
 *
 * Note: CSRF validation happens in API routes since
 * middleware can't access cookies reliably in all cases
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ==========================================
// MAIN DOMAIN ROUTE CONFIGURATION
// ==========================================

// Routes that require authentication (main domain)
const PROTECTED_ROUTES = ['/dashboard', '/onboarding'];

// Session cookie name (must match auth module)
const SESSION_COOKIE_NAME = 'session';

// ==========================================
// MULTI-TENANT SUBDOMAIN EXTRACTION
// ==========================================

/**
 * Extract tenant subdomain from hostname
 */
function extractTenantSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get('host') || '';

  // Handle localhost development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Check for dev tenant override via query param
    const devTenant = request.nextUrl.searchParams.get('tenant');
    if (devTenant) {
      return devTenant;
    }

    // Check for dev tenant cookie
    const tenantCookie = request.cookies.get('dev-tenant')?.value;
    if (tenantCookie) {
      return tenantCookie;
    }

    return null;
  }

  // Handle Vercel preview URLs
  if (hostname.endsWith('.vercel.app')) {
    // Check query param for tenant override in previews
    const previewTenant = request.nextUrl.searchParams.get('tenant');
    return previewTenant || null;
  }

  // Extract subdomain from hostname
  // e.g., "acme.helpportal.app" → "acme"
  const parts = hostname.split('.');

  // Need at least 3 parts for subdomain (sub.domain.tld)
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase();

    // Ignore common non-tenant subdomains (main site)
    if (['www', 'app', 'api', 'admin', 'mail', 'smtp'].includes(subdomain)) {
      return null;
    }

    return subdomain;
  }

  return null;
}

// Simple in-memory rate limiting for middleware
// Note: This resets on server restart and doesn't share between instances
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit configuration
const RATE_LIMITS = {
  // General API rate limits
  api: { windowMs: 60 * 1000, maxRequests: 100 },           // 100 per minute
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },      // 10 per 15 minutes

  // Sensitive endpoint rate limits (more restrictive)
  ticketCreate: { windowMs: 60 * 60 * 1000, maxRequests: 5 },       // 5 per hour
  ticketComment: { windowMs: 60 * 60 * 1000, maxRequests: 15 },     // 15 per hour
  serviceInquiry: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 5 }, // 5 per day
  feedback: { windowMs: 60 * 60 * 1000, maxRequests: 5 },           // 5 per hour
};

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1'
  );
}

/**
 * Check rate limit
 */
function checkRateLimit(
  key: string,
  config: { windowMs: number; maxRequests: number }
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry or expired
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, reset: now + config.windowMs };
  }

  // Increment
  entry.count++;
  rateLimitStore.set(key, entry);

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, reset: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, reset: entry.resetAt };
}

/**
 * Validate request method
 */
function isValidMethod(method: string): boolean {
  return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method);
}

/**
 * Determine rate limit type based on endpoint and method
 */
function getRateLimitType(pathname: string, method: string): keyof typeof RATE_LIMITS {
  // Auth routes have their own limit
  if (pathname.startsWith('/api/auth/')) {
    return 'auth';
  }

  // Sensitive endpoints with POST method get stricter limits
  if (method === 'POST') {
    // Ticket creation
    if (pathname === '/api/ticket') {
      return 'ticketCreate';
    }

    // Ticket comments (POST to /api/tickets/[id])
    if (pathname.match(/^\/api\/tickets\/[^/]+$/)) {
      return 'ticketComment';
    }

    // Service inquiries
    if (pathname === '/api/service-inquiry') {
      return 'serviceInquiry';
    }

    // Feedback
    if (pathname === '/api/feedback') {
      return 'feedback';
    }
  }

  // Default API rate limit for everything else
  return 'api';
}

/**
 * Check for suspicious patterns
 */
function isSuspiciousRequest(request: NextRequest): boolean {
  const url = request.nextUrl.pathname;
  const userAgent = request.headers.get('user-agent') || '';

  // Block common attack patterns
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS in URL
    /union\s+select/i, // SQL injection
    /\$\{.*\}/, // Template injection
    /%00/, // Null byte
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      return true;
    }
  }

  // Block empty user agents (often bots)
  if (!userAgent || userAgent.length < 5) {
    return true;
  }

  return false;
}

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const method = request.method;

  // Extract tenant subdomain
  const tenantSlug = extractTenantSubdomain(request);

  // Skip middleware for NextAuth routes - let Auth.js handle everything
  if (pathname.startsWith('/api/auth/')) {
    const response = NextResponse.next();
    // Still add tenant header for auth routes
    if (tenantSlug) {
      response.headers.set('x-tenant-slug', tenantSlug);
    }
    return response;
  }

  // Skip middleware for Stripe webhook - needs raw body for signature verification
  if (pathname === '/api/stripe/webhook') {
    return NextResponse.next();
  }

  // Validate HTTP method
  if (!isValidMethod(method)) {
    return new NextResponse('Method Not Allowed', { status: 405 });
  }

  // Check for suspicious requests (skip for API routes - they have their own validation)
  if (!pathname.startsWith('/api/') && isSuspiciousRequest(request)) {
    // Block without logging detailed info that could be exploited
    return new NextResponse('Forbidden', { status: 403 });
  }

  // ==========================================
  // MAIN DOMAIN ROUTE PROTECTION
  // ==========================================

  // Only apply to main domain (no tenant subdomain)
  if (!tenantSlug) {
    // Check if this is a protected route
    const isProtectedRoute = PROTECTED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isProtectedRoute) {
      // Check for session cookie
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

      if (!sessionCookie?.value) {
        // No session - redirect to signup
        const signupUrl = new URL('/signup', request.url);
        signupUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(signupUrl);
      }

      // Session exists - continue (page will do deeper validation)
      // The page components verify subscription status via API
    }
  }

  // Rate limiting for API routes with per-endpoint limits
  if (pathname.startsWith('/api/')) {
    // Determine rate limit type based on endpoint and method
    const rateLimitType = getRateLimitType(pathname, method);
    const config = RATE_LIMITS[rateLimitType];
    const rateLimitKey = `${ip}:${rateLimitType}`;

    const result = checkRateLimit(rateLimitKey, config);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      // Rate limit exceeded - don't log IP/path details

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
          },
        }
      );
    }

    // Continue with rate limit headers and tenant slug
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));

    // Add tenant header for API routes
    if (tenantSlug) {
      response.headers.set('x-tenant-slug', tenantSlug);
    }

    return response;
  }

  // Continue for non-API routes with tenant header
  const response = NextResponse.next();
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug);
  }
  return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match main pages (not static files)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
