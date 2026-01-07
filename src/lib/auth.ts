/**
 * Authentication module with Discord OAuth + Mock fallback
 *
 * Features:
 * - Real Discord OAuth with custom session management
 * - Mock mode for development (when Discord credentials not configured)
 * - Encrypted session tokens
 * - httpOnly secure cookies
 * - No sensitive data exposed to client
 */

import { cookies } from 'next/headers';
import { mockUser, mockServers } from './data/servers';
import { PublicUser, MockUser, MockServer } from '@/types';
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
 * Check if Discord OAuth is configured
 */
function isDiscordConfigured(): boolean {
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
  return process.env.MOCK_AUTH === 'true' || !isDiscordConfigured();
}

/**
 * Convert full user to public user (strips sensitive server data)
 * NEVER expose internal IDs or server details
 */
function toPublicUser(user: MockUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    serverCount: user.servers.length,
  };
}

/**
 * Convert to safe user (for client responses - no IDs)
 */
function toSafeUser(user: { username: string; avatar?: string | null }): SafeUser {
  return sanitizeUserResponse({
    username: user.username,
    avatar: user.avatar || undefined,
  })!;
}

/**
 * Get session from our encrypted cookie
 * Works for both Discord OAuth and mock mode
 */
async function getSessionFromCookie(): Promise<{
  userId: string;
  provider: 'discord' | 'mock';
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
 * Get current session
 * Uses our custom encrypted session cookie for both Discord and mock
 */
export async function getSession(): Promise<PublicUser | null> {
  const session = await getSessionFromCookie();

  if (!session) {
    return null;
  }

  // Discord OAuth session
  if (session.provider === 'discord') {
    return {
      id: session.userId,
      username: (session.data.username as string) || 'User',
      discriminator: (session.data.discriminator as string) || '0',
      avatar: (session.data.avatar as string) || '/avatars/default.png',
      serverCount: (session.data.guildCount as number) || 0,
    };
  }

  // Mock session - verify it's the mock user
  if (session.provider === 'mock' && session.userId === mockUser.id) {
    return toPublicUser(mockUser);
  }

  return null;
}

/**
 * Get safe user for client responses (no IDs exposed)
 */
export async function getSafeUser(): Promise<SafeUser | null> {
  const session = await getSessionFromCookie();

  if (!session) {
    return null;
  }

  // Discord OAuth session
  if (session.provider === 'discord') {
    return toSafeUser({
      username: (session.data.username as string) || 'User',
      avatar: session.data.avatar as string | null,
    });
  }

  // Mock session
  if (session.provider === 'mock' && session.userId === mockUser.id) {
    return toSafeUser(mockUser);
  }

  return null;
}

/**
 * Get full user data (server-side only, for ticket form server list)
 * NEVER expose this to client responses
 */
export async function getFullUser(): Promise<MockUser | null> {
  const session = await getSessionFromCookie();

  if (!session) {
    return null;
  }

  // Discord OAuth session
  if (session.provider === 'discord') {
    return {
      id: session.userId,
      username: (session.data.username as string) || 'User',
      discriminator: (session.data.discriminator as string) || '0',
      avatar: (session.data.avatar as string) || '/avatars/default.png',
      servers: mockServers, // Use mock servers for now
    };
  }

  // Mock session
  if (session.provider === 'mock' && session.userId === mockUser.id) {
    return mockUser;
  }

  return null;
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
 * For Discord OAuth, the callback handler creates the session
 */
export async function createSession(): Promise<SafeUser> {
  // Mock mode - create encrypted session
  const cookieStore = await cookies();

  const token = createSessionToken({
    userId: mockUser.id,
    provider: 'mock',
    data: {
      username: mockUser.username,
    },
  });

  cookieStore.set(SESSION_COOKIE_CONFIG.name, token, {
    httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
    secure: SESSION_COOKIE_CONFIG.secure,
    sameSite: SESSION_COOKIE_CONFIG.sameSite,
    path: SESSION_COOKIE_CONFIG.path,
    maxAge: SESSION_COOKIE_CONFIG.maxAge,
  });

  return toSafeUser(mockUser);
}

/**
 * Destroy session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const logoutOptions = getLogoutCookieOptions();

  cookieStore.set(logoutOptions.name, logoutOptions.value, logoutOptions.options);
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
export function getAuthMode(): 'discord' | 'mock' {
  return isMockMode() ? 'mock' : 'discord';
}

/**
 * Get user's servers/guilds
 */
export async function getUserServers(): Promise<MockServer[]> {
  const user = await getFullUser();
  return user?.servers || [];
}
