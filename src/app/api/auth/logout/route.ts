import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession, getDiscordAccessToken } from '@/lib/auth';
import { SESSION_COOKIE_CONFIG } from '@/lib/security/session';
import { revokeDiscordToken } from '@/lib/discord/oauth';
import {
  logLogout,
  getClientIp,
} from '@/lib/security/logger';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  try {
    // Get user before destroying session (for logging)
    const user = await getSession();

    // Revoke Discord access token if present
    // This invalidates the token on Discord's side for security
    const accessToken = await getDiscordAccessToken();
    if (accessToken) {
      // Don't await - revocation shouldn't block logout
      // If it fails, the session is still cleared locally
      revokeDiscordToken(accessToken).catch((err) => {
        console.error('[Logout] Token revocation failed:', err);
      });
    }

    // Log logout event
    logLogout({
      ip,
      userId: user?.id,
    });

    // Revalidate cache to prevent stale auth state
    revalidatePath('/', 'layout');

    // Create response with explicit Set-Cookie header to clear the session
    // This is more reliable than using cookies().set() before returning NextResponse
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Clear session cookie by setting it with maxAge=0
    // No domain = subdomain-specific (matches how it was set)
    response.cookies.set(SESSION_COOKIE_CONFIG.name, '', {
      httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
      secure: SESSION_COOKIE_CONFIG.secure,
      sameSite: SESSION_COOKIE_CONFIG.sameSite,
      path: SESSION_COOKIE_CONFIG.path,
      maxAge: 0,
    });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Cache-Control', 'no-store');

    return response;
  } catch (error) {
    console.error('[Logout] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
