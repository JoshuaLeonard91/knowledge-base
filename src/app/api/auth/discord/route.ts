/**
 * Discord OAuth Redirect Route
 *
 * Manually constructs Discord OAuth URL and redirects
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_AUTHORIZE_URL = 'https://discord.com/api/oauth2/authorize';
const SCOPES = ['identify', 'guilds'].join(' ');

function generateState(): string {
  return randomBytes(32).toString('hex');
}

export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/support';
  const baseUrl = process.env.AUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  // Generate state for CSRF protection
  const state = generateState();

  // Store state and callbackUrl in cookie for verification
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });
  cookieStore.set('oauth_callback', callbackUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  // Construct Discord OAuth URL
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: `${baseUrl}/api/auth/callback/discord`,
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
