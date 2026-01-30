/**
 * Discord OAuth Redirect Route
 *
 * Manually constructs Discord OAuth URL and redirects.
 * Uses AUTH_URL (main domain) for OAuth callback, then redirects back to tenant subdomain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_AUTHORIZE_URL = 'https://discord.com/api/oauth2/authorize';
const SCOPES = ['identify', 'guilds'].join(' ');

function generateState(): string {
  // Include timestamp for expiration validation in callback
  const random = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  return `${random}.${timestamp}`;
}

export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/support';

  // AUTH_URL should be your main domain (e.g., https://helpportal.app)
  // This is what's registered in Discord OAuth settings
  const authBaseUrl = process.env.AUTH_URL || 'http://localhost:3000';

  // Get the current origin (could be tenant subdomain)
  const currentOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  // Generate state for CSRF protection
  const state = generateState();

  // Store state, callbackUrl, and origin for redirect after auth
  const cookieStore = await cookies();

  // Use domain-wide cookie so it works across subdomains
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 10, // 10 minutes
    path: '/',
    // Set domain to allow cookie sharing across subdomains in production
    ...(process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_DOMAIN
      ? { domain: process.env.AUTH_COOKIE_DOMAIN } // e.g., '.helpportal.app'
      : {}),
  };

  cookieStore.set('oauth_state', state, cookieOptions);
  cookieStore.set('oauth_callback', callbackUrl, cookieOptions);
  cookieStore.set('oauth_origin', currentOrigin, cookieOptions); // Store tenant origin

  // Construct Discord OAuth URL - always use main domain for callback
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: `${authBaseUrl}/api/auth/callback/discord`,
    response_type: 'code',
    scope: SCOPES,
    state: state,
  });

  const discordAuthUrl = `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;

  // Redirect to Discord
  return NextResponse.redirect(discordAuthUrl);
}

export async function POST(request: NextRequest) {
  // Same as GET
  return GET(request);
}
