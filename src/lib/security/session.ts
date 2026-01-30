/**
 * Secure session management
 *
 * Features:
 * - Cryptographically random session IDs
 * - HMAC-SHA256 signed tokens
 * - AES-256-GCM encrypted session data
 * - Expiration validation
 * - Session rotation support
 */

import {
  encrypt,
  decrypt,
  encryptToString,
  decryptFromString,
  sign,
  verify,
  generateSecureToken,
  generateUrlSafeToken,
} from './crypto';

/**
 * Session payload structure
 */
export interface SessionPayload {
  sid: string; // Session ID (random, not user ID)
  uid: string; // User identifier (encrypted internally)
  provider: 'discord' | 'mock'; // Auth provider
  exp: number; // Expiration timestamp (ms)
  iat: number; // Issued at timestamp (ms)
  data?: Record<string, unknown>; // Additional encrypted data
}

/**
 * Parsed session token
 */
export interface ParsedSession {
  valid: boolean;
  expired: boolean;
  payload: SessionPayload | null;
  error?: string;
}

// Session configuration
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_VERSION = 'v1';
const HANDOFF_TOKEN_VERSION = 'h1';
const HANDOFF_EXPIRY_MS = 5 * 1000; // 5 seconds - very short lived

/**
 * Create a new session token
 */
export function createSessionToken(params: {
  userId: string;
  provider: 'discord' | 'mock';
  data?: Record<string, unknown>;
  expiresIn?: number; // Override default duration (ms)
}): string {
  const now = Date.now();
  const exp = now + (params.expiresIn || SESSION_DURATION_MS);

  // Create payload
  const payload: SessionPayload = {
    sid: generateSecureToken(16), // Random session ID
    uid: params.userId,
    provider: params.provider,
    exp,
    iat: now,
    data: params.data,
  };

  // Encrypt the payload
  const encrypted = encryptToString(JSON.stringify(payload));

  // Sign the encrypted data
  const signature = sign(encrypted);

  // Combine: version.encrypted.signature
  return `${TOKEN_VERSION}.${encrypted}.${signature}`;
}

/**
 * Parse and validate a session token
 */
export function parseSessionToken(token: string): ParsedSession {
  try {
    // Split token parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, expired: false, payload: null, error: 'Invalid token format' };
    }

    const [version, encrypted, signature] = parts;

    // Check version
    if (version !== TOKEN_VERSION) {
      return { valid: false, expired: false, payload: null, error: 'Unsupported token version' };
    }

    // Verify signature
    if (!verify(encrypted, signature)) {
      return { valid: false, expired: false, payload: null, error: 'Invalid signature' };
    }

    // Decrypt payload
    const decrypted = decryptFromString(encrypted);
    const payload = JSON.parse(decrypted) as SessionPayload;

    // Check expiration
    const now = Date.now();
    if (payload.exp < now) {
      return { valid: false, expired: true, payload, error: 'Session expired' };
    }

    return { valid: true, expired: false, payload };
  } catch (err) {
    return {
      valid: false,
      expired: false,
      payload: null,
      error: err instanceof Error ? err.message : 'Token parse error',
    };
  }
}

/**
 * Verify a session token is valid (not parsing full data)
 */
export function isValidSessionToken(token: string): boolean {
  const result = parseSessionToken(token);
  return result.valid;
}

/**
 * Get session payload if valid
 */
export function getSessionPayload(token: string): SessionPayload | null {
  const result = parseSessionToken(token);
  return result.valid ? result.payload : null;
}

/**
 * Check if session needs rotation (close to expiry)
 */
export function needsRotation(token: string, thresholdMs: number = 6 * 60 * 60 * 1000): boolean {
  const result = parseSessionToken(token);
  if (!result.valid || !result.payload) return false;

  const timeRemaining = result.payload.exp - Date.now();
  return timeRemaining < thresholdMs;
}

/**
 * Rotate session (create new token with same data)
 */
export function rotateSession(token: string): string | null {
  const result = parseSessionToken(token);
  if (!result.valid || !result.payload) return null;

  return createSessionToken({
    userId: result.payload.uid,
    provider: result.payload.provider,
    data: result.payload.data,
  });
}

/**
 * Encrypt arbitrary session data
 */
export function encryptSessionData(data: Record<string, unknown>): string {
  return encryptToString(JSON.stringify(data));
}

/**
 * Decrypt session data
 */
export function decryptSessionData(encrypted: string): Record<string, unknown> | null {
  try {
    return JSON.parse(decryptFromString(encrypted));
  } catch {
    return null;
  }
}

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  return generateUrlSafeToken(24);
}

/**
 * Cookie configuration for sessions
 *
 * NOTE: No domain attribute = subdomain-isolated sessions
 * Each subdomain (tenant) has its own session, users must log in per-tenant.
 * This is the recommended approach for multi-tenant SaaS.
 */
export const SESSION_COOKIE_CONFIG = {
  name: 'session',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // NOTE: 'lax' is required (not 'strict') because OAuth callback redirects
  // arrive from Discord (external site) → main domain → tenant subdomain.
  // 'strict' would block the cookie on the redirect from set-session.
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_DURATION_MS / 1000, // Convert to seconds for cookie
  // NO domain = cookie is specific to the exact subdomain that sets it
};

/**
 * Create cookie options with session token
 */
export function getSessionCookieOptions(token: string): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge: number;
  };
} {
  return {
    name: SESSION_COOKIE_CONFIG.name,
    value: token,
    options: {
      httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
      secure: SESSION_COOKIE_CONFIG.secure,
      sameSite: SESSION_COOKIE_CONFIG.sameSite,
      path: SESSION_COOKIE_CONFIG.path,
      maxAge: SESSION_COOKIE_CONFIG.maxAge,
    },
  };
}

/**
 * Invalidate session (for logout)
 * Returns cookie options to clear the session
 */
export function getLogoutCookieOptions(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
    maxAge: number;
  };
} {
  return {
    name: SESSION_COOKIE_CONFIG.name,
    value: '',
    options: {
      httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
      secure: SESSION_COOKIE_CONFIG.secure,
      sameSite: SESSION_COOKIE_CONFIG.sameSite,
      path: SESSION_COOKIE_CONFIG.path,
      maxAge: 0, // Immediate expiration
    },
  };
}

// ============================================
// HANDOFF TOKENS - Short-lived tokens for OAuth redirect
// ============================================

/**
 * Handoff token payload - wraps a session token for secure redirect
 */
interface HandoffPayload {
  sessionToken: string;
  exp: number;
  nonce: string; // Random value to ensure uniqueness
}

/**
 * Create a short-lived handoff token that wraps a session token
 * Used to securely pass session token during OAuth redirect
 *
 * SECURITY:
 * - Expires in 5 seconds (useless if logged)
 * - Single use (nonce makes each token unique)
 * - Encrypted and signed
 */
export function createHandoffToken(sessionToken: string): string {
  const payload: HandoffPayload = {
    sessionToken,
    exp: Date.now() + HANDOFF_EXPIRY_MS,
    nonce: generateSecureToken(8),
  };

  const encrypted = encryptToString(JSON.stringify(payload));
  const signature = sign(encrypted);

  return `${HANDOFF_TOKEN_VERSION}.${encrypted}.${signature}`;
}

/**
 * Parse and validate a handoff token, returning the wrapped session token
 * Returns null if invalid, expired, or tampered
 */
export function parseHandoffToken(handoffToken: string): string | null {
  try {
    const parts = handoffToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [version, encrypted, signature] = parts;

    // Check version
    if (version !== HANDOFF_TOKEN_VERSION) {
      return null;
    }

    // Verify signature
    if (!verify(encrypted, signature)) {
      return null;
    }

    // Decrypt payload
    const decrypted = decryptFromString(encrypted);
    const payload = JSON.parse(decrypted) as HandoffPayload;

    // Check expiration (strict - 30 second window)
    if (Date.now() > payload.exp) {
      return null;
    }

    // Validate the wrapped session token
    if (!isValidSessionToken(payload.sessionToken)) {
      return null;
    }

    return payload.sessionToken;
  } catch {
    return null;
  }
}
