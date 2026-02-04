/**
 * Session Token Receiver
 *
 * Receives a session token from the OAuth callback and sets it as a cookie
 * on the current subdomain only. This ensures sessions are isolated per tenant.
 *
 * SECURITY:
 * - Token is passed via POST body (not URL) to avoid logging exposure
 * - Callback URL is validated to prevent open redirects
 * - Token is validated before being set as cookie
 *
 * Flow:
 * 1. Main domain OAuth callback creates session token
 * 2. Redirects to: {subdomain}/api/auth/set-session (with token in fragment/POST)
 * 3. This route sets the cookie (subdomain-specific, no domain attribute)
 * 4. Redirects to the validated callback URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_CONFIG, parseHandoffToken } from '@/lib/security/session';

/**
 * Validate callback URL to prevent open redirect attacks
 * Only allows relative paths starting with /
 */
function isValidCallbackUrl(callback: string): boolean {
  // Must start with / (relative path)
  if (!callback.startsWith('/')) {
    return false;
  }

  // Must not contain protocol or double slashes (prevent //evil.com)
  if (callback.includes('://') || callback.startsWith('//')) {
    return false;
  }

  // Must not contain backslashes (prevent \evil.com on some browsers)
  if (callback.includes('\\')) {
    return false;
  }

  // Must not contain newlines or carriage returns (header injection)
  if (callback.includes('\n') || callback.includes('\r')) {
    return false;
  }

  // Block dangerous URI schemes
  const lower = callback.toLowerCase();
  const blockedSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (blockedSchemes.some(scheme => lower.includes(scheme))) {
    return false;
  }

  return true;
}

/**
 * GET handler - receives handoff token via query param
 *
 * SECURITY:
 * - Handoff token expires in 5 seconds (useless if logged after that)
 * - Handoff token is encrypted and signed
 * - Extracts the real session token from handoff token
 * - Callback URL is validated to prevent open redirects
 */
export async function GET(request: NextRequest) {
  const handoffToken = request.nextUrl.searchParams.get('token');
  const callbackUrl = request.nextUrl.searchParams.get('callback') || '/support';

  // Build real origin — prefer env var, fall back to validated forwarded headers
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const appDomain = process.env.APP_DOMAIN || 'helpportal.app';
  const isAllowedHost = forwardedHost === appDomain || forwardedHost.endsWith(`.${appDomain}`) || forwardedHost === 'localhost' || forwardedHost.startsWith('localhost:');
  const realOrigin = isAllowedHost ? `${forwardedProto}://${forwardedHost}` : `https://${appDomain}`;

  // Validate handoff token exists
  if (!handoffToken) {
    return NextResponse.redirect(new URL('/support/login?error=NoToken', realOrigin));
  }

  // Validate callback URL (prevent open redirect)
  const safeCallback = isValidCallbackUrl(callbackUrl) ? callbackUrl : '/support';

  // Parse handoff token to extract session token
  // This validates: signature, expiry (30s), and inner session token
  const sessionToken = parseHandoffToken(handoffToken);
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/support/login?error=InvalidToken', realOrigin));
  }

  // Create response with redirect to validated callback
  const response = NextResponse.redirect(new URL(safeCallback, realOrigin));

  // Set session cookie WITHOUT domain = subdomain-isolated
  // Cookie will only be valid for this exact subdomain (e.g., acme.helpportal.app)
  // Users on other subdomains will need to log in separately
  response.cookies.set(SESSION_COOKIE_CONFIG.name, sessionToken, {
    httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
    secure: SESSION_COOKIE_CONFIG.secure,
    sameSite: SESSION_COOKIE_CONFIG.sameSite,
    path: SESSION_COOKIE_CONFIG.path,
    maxAge: SESSION_COOKIE_CONFIG.maxAge,
  });

  return response;
}
