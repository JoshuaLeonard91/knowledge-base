import 'server-only';

/**
 * Authentication module — Provider-agnostic
 *
 * Features:
 * - Multi-provider OAuth (Discord, Google, GitHub)
 * - Mock mode for development
 * - Encrypted session tokens (AES-256-GCM + HMAC-SHA256)
 * - httpOnly secure cookies
 * - No sensitive data exposed to client
 */

import { cookies } from 'next/headers';
import { SessionUser } from '@/types';
import {
  createSessionToken,
  parseSessionToken,
  needsRotation,
  rotateSession,
  SESSION_COOKIE_CONFIG,
  getLogoutCookieOptions,
} from './security/session';
import { SafeUser, sanitizeUserResponse } from './security/sanitize';

/**
 * Check if any OAuth provider is configured
 */
function isOAuthConfigured(): boolean {
  return !!(
    process.env.DISCORD_CLIENT_ID &&
    process.env.DISCORD_CLIENT_SECRET &&
    process.env.AUTH_SECRET
  );
}

/**
 * Check if mock mode is enabled
 */
function isMockMode(): boolean {
  if (process.env.NODE_ENV === 'production' && !isOAuthConfigured()) {
    console.error('[SECURITY] No OAuth provider configured in production! Authentication will fail.');
    return false;
  }
  return process.env.MOCK_AUTH === 'true' || !isOAuthConfigured();
}

/**
 * Get session from our encrypted cookie
 * Works for all OAuth providers and mock mode
 */
async function getSessionFromCookie(): Promise<{
  userId: string;
  provider: 'discord' | 'google' | 'github' | 'mock';
  data: Record<string, unknown>;
} | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_CONFIG.name);

  if (!sessionCookie?.value) {
    return null;
  }

  const parsed = parseSessionToken(sessionCookie.value);

  if (!parsed.valid || !parsed.payload) {
    return null;
  }

  // Check if session needs rotation
  if (needsRotation(sessionCookie.value)) {
    const newToken = rotateSession(sessionCookie.value);
    if (newToken) {
      cookieStore.set(SESSION_COOKIE_CONFIG.name, newToken, {
        httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
        secure: SESSION_COOKIE_CONFIG.secure,
        sameSite: SESSION_COOKIE_CONFIG.sameSite,
        path: SESSION_COOKIE_CONFIG.path,
        maxAge: SESSION_COOKIE_CONFIG.maxAge,
      });
    }
  }

  return {
    userId: parsed.payload.uid,
    provider: parsed.payload.provider,
    data: parsed.payload.data || {},
  };
}

/**
 * Get access token and provider from session (for token revocation on logout)
 */
export async function getAccessToken(): Promise<{ provider: string; token: string } | null> {
  const session = await getSessionFromCookie();
  if (!session) return null;

  const token = session.data.accessToken as string;
  if (!token) return null;

  return { provider: session.provider, token };
}

/**
 * Get current session — returns generic SessionUser
 * session.id is the internal User.id (cuid), NOT a provider-specific ID
 */
export async function getSession(): Promise<SessionUser | null> {
  const session = await getSessionFromCookie();
  if (!session) return null;

  // Mock session
  if (session.provider === 'mock') {
    return {
      id: session.userId,
      provider: 'mock',
      displayName: (session.data.displayName as string) || 'DemoUser',
      avatar: (session.data.avatar as string) || null,
      email: null,
    };
  }

  // OAuth session (Discord, Google, GitHub)
  return {
    id: session.userId,
    provider: session.provider,
    displayName: (session.data.displayName as string) || 'User',
    avatar: (session.data.avatar as string) || null,
    email: (session.data.email as string) || null,
  };
}

/**
 * Get safe user for client responses (no IDs exposed)
 */
export async function getSafeUser(): Promise<SafeUser | null> {
  const session = await getSession();
  if (!session) return null;

  return sanitizeUserResponse({
    displayName: session.displayName,
    avatarUrl: session.avatar || undefined,
    provider: session.provider,
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSessionFromCookie();
  return session !== null;
}

/**
 * Get session ID for CSRF binding (hashed)
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_CONFIG.name);

  if (!sessionCookie?.value) {
    return null;
  }

  const parsed = parseSessionToken(sessionCookie.value);
  return parsed.payload?.sid || null;
}

/**
 * Create session (mock mode only)
 * For OAuth providers, the callback handler creates the session
 */
export async function createSession(): Promise<SafeUser> {
  const cookieStore = await cookies();

  const token = createSessionToken({
    userId: 'mock-user-id',
    provider: 'mock',
    data: {
      displayName: 'DemoUser',
    },
  });

  cookieStore.set(SESSION_COOKIE_CONFIG.name, token, {
    httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
    secure: SESSION_COOKIE_CONFIG.secure,
    sameSite: SESSION_COOKIE_CONFIG.sameSite,
    path: SESSION_COOKIE_CONFIG.path,
    maxAge: SESSION_COOKIE_CONFIG.maxAge,
  });

  return {
    displayName: 'DemoUser',
    isAuthenticated: true,
  };
}

/**
 * Destroy session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_CONFIG.name, '', {
    httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
    secure: SESSION_COOKIE_CONFIG.secure,
    sameSite: SESSION_COOKIE_CONFIG.sameSite,
    path: SESSION_COOKIE_CONFIG.path,
    maxAge: 0,
  });
}

/**
 * Validate session token format (for middleware)
 */
export function isValidTokenFormat(token: string): boolean {
  const parsed = parseSessionToken(token);
  return parsed.valid;
}

/**
 * Get authentication mode
 */
export function getAuthMode(): 'oauth' | 'mock' {
  return isMockMode() ? 'mock' : 'oauth';
}
