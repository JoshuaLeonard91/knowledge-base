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

// Session cookie name (must match SESSION_COOKIE_CONFIG in session.ts)
const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-session' : 'session';

// ==========================================
// MULTI-TENANT SUBDOMAIN EXTRACTION
// ==========================================

/**
 * Extract tenant subdomain from hostname
 */
function extractTenantSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get('host') || '';

  // Handle localhost development - only allow dev tenant overrides in non-production
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    if (process.env.NODE_ENV !== 'production') {
      // Check for dev tenant override via query param
      // ?tenant=slug → set cookie and use slug
      // ?tenant=    → clear cookie (return to main domain)
      const devTenantParam = request.nextUrl.searchParams.get('tenant');
      if (devTenantParam !== null) {
        // Explicit param always wins (even empty string to clear)
        return devTenantParam || null;
      }

      // Check for dev tenant cookie (persisted from a previous ?tenant= param)
      const tenantCookie = request.cookies.get('dev-tenant')?.value;
      if (tenantCookie) {
        return tenantCookie;
      }
    }

    return null;
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
const RATE_LIMIT_MAX_ENTRIES = 10000;
let rateLimitLastCleanup = Date.now();
const RATE_LIMIT_CLEANUP_INTERVAL = 60 * 1000; // Clean up every 60 seconds

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
/**
 * Get client IP from request.
 * Uses the RIGHTMOST x-forwarded-for entry — the one appended by the
 * trusted reverse proxy (DigitalOcean App Platform). The leftmost entry
 * is client-controlled and can be spoofed to bypass rate limiting.
 */
function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const ips = xff.split(',').map(ip => ip.trim()).filter(Boolean);
    // Rightmost = appended by the trusted proxy (DO App Platform)
    if (ips.length > 0) return ips[ips.length - 1];
  }
  return (
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

  // Periodic cleanup of expired entries to prevent unbounded memory growth
  if (now - rateLimitLastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    rateLimitLastCleanup = now;
    for (const [k, v] of rateLimitStore) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
    // Hard cap: if still too large, drop oldest entries
    if (rateLimitStore.size > RATE_LIMIT_MAX_ENTRIES) {
      const excess = rateLimitStore.size - RATE_LIMIT_MAX_ENTRIES;
      const keys = rateLimitStore.keys();
      for (let i = 0; i < excess; i++) {
        const k = keys.next().value;
        if (k) rateLimitStore.delete(k);
      }
    }
  }

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
 * In development, persist or clear the dev-tenant cookie based on ?tenant= query param.
 * This allows tenant context to survive across navigations and page reloads on localhost.
 */
function syncDevTenantCookie(response: NextResponse, request: NextRequest): void {
  if (process.env.NODE_ENV === 'production') return;
  const hostname = request.headers.get('host') || '';
  if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) return;

  const paramTenant = request.nextUrl.searchParams.get('tenant');
  if (paramTenant !== null) {
    if (paramTenant) {
      // ?tenant=slug → persist as cookie (30 day expiry)
      response.cookies.set('dev-tenant', paramTenant, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    } else {
      // ?tenant= (empty) → clear cookie, return to main domain
      response.cookies.delete('dev-tenant');
    }
  }
}

/**
 * Nonce-based Content Security Policy
 *
 * Generates a fresh nonce per request for script-src. Modern browsers that
 * support nonces ignore 'unsafe-inline' in script-src (backward-compatible
 * fallback for older browsers). 'strict-dynamic' allows scripts loaded by
 * nonced scripts (Next.js dynamic chunks).
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob: https://cdn.discordapp.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://discord.com https://*.atlassian.net https://*.atlassian.com https://api.atlassian.com https://*.hygraph.com https://*.graphassets.com https://api.stripe.com",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://discord.com https://accounts.google.com https://github.com",
    "object-src 'none'",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join('; ');
}

/** Apply security headers + nonce-based CSP to a response */
function applySecurityHeaders(response: NextResponse, nonce: string): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);
  const method = request.method;

  // Defense-in-depth: strip internal header that could bypass middleware (CVE-2025-29927)
  request.headers.delete('x-middleware-subrequest');

  // Generate per-request nonce for CSP script-src
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Extract tenant subdomain
  const tenantSlug = extractTenantSubdomain(request);

  // Skip middleware for Stripe webhooks - needs raw body for signature verification
  if (pathname === '/api/stripe/webhook' || pathname === '/api/checkout/webhook') {
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

  // Rate-limit auth ACTION routes (OAuth initiation, logout)
  // Excluded from strict auth limit:
  //   /api/auth/session    — fires on every page load and tab-focus (100/min general limit)
  //   /api/auth/login      — provider config check, fires on every LoginButton mount
  //   /api/auth/callback/* — OAuth provider redirects back here (requires valid state token)
  //   /api/auth/set-session — handoff step (requires valid 5s handoff token)
  const isAuthExempt = pathname === '/api/auth/session'
    || pathname === '/api/auth/login'
    || pathname.startsWith('/api/auth/callback/')
    || pathname === '/api/auth/set-session';
  if (pathname.startsWith('/api/auth/') && !isAuthExempt) {
    const rateLimitKey = `${ip}:auth`;
    const tenantKey = tenantSlug ? `tenant:${tenantSlug}:auth` : null;
    const result = checkRateLimit(rateLimitKey, RATE_LIMITS.auth);

    // Also enforce per-tenant limit if on a subdomain
    if (tenantKey) {
      checkRateLimit(tenantKey, RATE_LIMITS.auth);
    }

    if (!result.allowed) {
      // For browser-navigated auth routes (OAuth initiation), redirect to login
      // with error param instead of returning raw JSON
      const isOAuthInit = pathname.match(/^\/api\/auth\/(?:discord|google|github)$/);
      if (isOAuthInit) {
        const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
        const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
        const appDomain = process.env.APP_DOMAIN || 'helpportal.app';
        const isAllowedHost = forwardedHost === appDomain || forwardedHost.endsWith(`.${appDomain}`) || forwardedHost === 'localhost' || forwardedHost.startsWith('localhost:');
        const origin = isAllowedHost ? `${forwardedProto}://${forwardedHost}` : `https://${appDomain}`;
        return NextResponse.redirect(new URL('/support/login?error=RateLimit', origin));
      }

      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Too many requests', code: 'RATE_LIMIT' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (tenantSlug) {
      response.headers.set('x-tenant-slug', tenantSlug);
    }
    applySecurityHeaders(response, nonce);
    syncDevTenantCookie(response, request);
    return response;
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
        // Use forwarded headers since DO App Platform runs an internal reverse proxy
        const fwdHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
        const fwdProto = request.headers.get('x-forwarded-proto') || 'https';
        const appDomain = process.env.APP_DOMAIN || 'helpportal.app';
        const isAllowedHost = fwdHost === appDomain || fwdHost.endsWith(`.${appDomain}`) || fwdHost === 'localhost' || fwdHost.startsWith('localhost:');
        const origin = isAllowedHost ? `${fwdProto}://${fwdHost}` : (process.env.NEXT_PUBLIC_APP_URL || `https://${appDomain}`);
        const signupUrl = new URL('/signup', origin);
        signupUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(signupUrl);
      }

      // Session exists - continue (page will do deeper validation)
      // The page components verify subscription status via API
    }
  }

  // Rate limiting for API routes with per-endpoint + per-tenant limits
  if (pathname.startsWith('/api/')) {
    // Determine rate limit type based on endpoint and method
    const rateLimitType = getRateLimitType(pathname, method);
    const config = RATE_LIMITS[rateLimitType];
    const rateLimitKey = `${ip}:${rateLimitType}`;

    const result = checkRateLimit(rateLimitKey, config);

    // Per-tenant rate limiting: prevent one tenant from exhausting shared resources
    if (tenantSlug) {
      const tenantKey = `tenant:${tenantSlug}:${rateLimitType}`;
      const tenantResult = checkRateLimit(tenantKey, config);
      if (!tenantResult.allowed && result.allowed) {
        // Tenant limit exceeded even though IP limit is fine
        const retryAfter = Math.ceil((tenantResult.reset - Date.now()) / 1000);
        return new NextResponse(
          JSON.stringify({ success: false, error: 'Too many requests', code: 'RATE_LIMIT' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          }
        );
      }
    }

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

    // Continue with rate limit headers, nonce, and tenant slug
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.reset / 1000)));

    // Apply security headers to all API responses
    applySecurityHeaders(response, nonce);
    response.headers.set('Cache-Control', 'no-store, private');

    // Add tenant header for API routes
    if (tenantSlug) {
      response.headers.set('x-tenant-slug', tenantSlug);
    }

    syncDevTenantCookie(response, request);
    return response;
  }

  // Continue for non-API routes with tenant header + security headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response, nonce);
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug);
  }
  syncDevTenantCookie(response, request);
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
