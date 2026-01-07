/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Uses double-submit cookie pattern:
 * 1. Generate CSRF token and store in httpOnly cookie
 * 2. Client sends token in header (X-CSRF-Token) or body
 * 3. Server validates token matches cookie
 *
 * Token is tied to session for extra security
 */

import { cookies } from 'next/headers';
import { generateSecureToken, sign, verify } from './crypto';

// CSRF cookie configuration
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Generate a CSRF token tied to session ID
 */
export function generateCsrfToken(sessionId?: string): string {
  const randomPart = generateSecureToken(CSRF_TOKEN_LENGTH);
  const timestamp = Date.now().toString(36);

  // If session ID provided, bind token to session
  const data = sessionId ? `${randomPart}.${timestamp}.${sessionId}` : `${randomPart}.${timestamp}`;

  // Sign the token
  const signature = sign(data);

  return `${data}.${signature}`;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(
  token: string,
  sessionId?: string
): { valid: boolean; error?: string } {
  try {
    const parts = token.split('.');

    // Token should have 3 or 4 parts depending on session binding
    if (parts.length < 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const signature = parts.pop()!;
    const data = parts.join('.');

    // Verify signature
    if (!verify(data, signature)) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check timestamp (24 hour validity)
    const timestamp = parseInt(parts[1], 36);
    const age = Date.now() - timestamp;
    if (age > CSRF_MAX_AGE * 1000) {
      return { valid: false, error: 'Token expired' };
    }

    // If session bound, verify session matches
    if (parts.length === 3 && sessionId) {
      if (parts[2] !== sessionId) {
        return { valid: false, error: 'Session mismatch' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Token validation failed' };
  }
}

/**
 * Set CSRF cookie (server action)
 */
export async function setCsrfCookie(sessionId?: string): Promise<string> {
  const token = generateCsrfToken(sessionId);
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: CSRF_MAX_AGE,
  });

  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCsrfFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Validate CSRF from request
 * Checks both cookie and header/body
 */
export async function validateCsrfRequest(
  request: Request,
  sessionId?: string
): Promise<{ valid: boolean; error?: string }> {
  // Get token from cookie
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!cookieToken) {
    return { valid: false, error: 'CSRF cookie missing' };
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Or from body (for form submissions)
  let bodyToken: string | undefined;
  if (!headerToken && request.method === 'POST') {
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const body = await request.clone().json();
        bodyToken = body._csrf || body.csrfToken;
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.clone().formData();
        bodyToken = formData.get('_csrf')?.toString();
      }
    } catch {
      // Body parse failed, continue with header check
    }
  }

  const submittedToken = headerToken || bodyToken;

  if (!submittedToken) {
    return { valid: false, error: 'CSRF token not provided' };
  }

  // Tokens must match
  if (cookieToken !== submittedToken) {
    return { valid: false, error: 'CSRF token mismatch' };
  }

  // Validate the token itself
  return validateCsrfToken(cookieToken, sessionId);
}

/**
 * CSRF cookie configuration for manual setting
 */
export const CSRF_COOKIE_CONFIG = {
  name: CSRF_COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: CSRF_MAX_AGE,
};

/**
 * Get CSRF header name for client
 */
export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME;
}

/**
 * Methods that require CSRF protection
 */
export const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Check if request method requires CSRF
 */
export function requiresCsrf(method: string): boolean {
  return CSRF_PROTECTED_METHODS.includes(method.toUpperCase());
}
