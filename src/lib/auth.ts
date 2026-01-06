import { cookies } from 'next/headers';
import { mockUser } from './data/servers';
import { PublicUser, MockUser } from '@/types';

const AUTH_COOKIE_NAME = 'mock_auth_session';

// Convert full user to public user (strips sensitive server data)
function toPublicUser(user: MockUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    serverCount: user.servers.length,
  };
}

// Get current session (server-side only)
export async function getSession(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  // In a real app, you'd verify the session token
  // For mock, we just check if cookie exists and equals our mock user ID
  if (sessionCookie.value === mockUser.id) {
    return toPublicUser(mockUser);
  }

  return null;
}

// Get full user data (server-side only, for ticket form server list)
export async function getFullUser(): Promise<MockUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!sessionCookie?.value || sessionCookie.value !== mockUser.id) {
    return null;
  }

  return mockUser;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

// Create session (sets httpOnly cookie)
export async function createSession(): Promise<PublicUser> {
  const cookieStore = await cookies();

  // Set httpOnly cookie - not accessible from JavaScript
  cookieStore.set(AUTH_COOKIE_NAME, mockUser.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

  return toPublicUser(mockUser);
}

// Destroy session (clears cookie)
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
