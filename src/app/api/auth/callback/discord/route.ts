/**
 * Custom Discord OAuth Callback Handler
 *
 * Exchanges authorization code for tokens and creates session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createSessionToken,
  SESSION_COOKIE_CONFIG,
} from '@/lib/security/session';
import { logAuthAttempt } from '@/lib/security/logger';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
const DISCORD_GUILDS_URL = 'https://discord.com/api/users/@me/guilds';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name?: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const baseUrl = process.env.AUTH_URL || 'http://localhost:3000';

  // Get code and state from query params
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  // Handle errors from Discord
  if (error) {
    logAuthAttempt({
      success: false,
      method: 'discord',
      details: { error: 'access_denied' },
    });
    return NextResponse.redirect(`${baseUrl}/support/login?error=AccessDenied`);
  }

  // Verify code exists
  if (!code) {
    return NextResponse.redirect(`${baseUrl}/support/login?error=Configuration`);
  }

  // Verify state (CSRF protection)
  const storedState = cookieStore.get('oauth_state')?.value;
  if (!storedState || storedState !== state) {
    logAuthAttempt({
      success: false,
      method: 'discord',
      details: { error: 'state_mismatch' },
    });
    return NextResponse.redirect(`${baseUrl}/support/login?error=Configuration`);
  }

  // Get callback URL
  const callbackUrl = cookieStore.get('oauth_callback')?.value || '/support';

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${baseUrl}/api/auth/callback/discord`,
      }),
    });

    if (!tokenResponse.ok) {
      logAuthAttempt({
        success: false,
        method: 'discord',
        details: { error: 'token_exchange_failed' },
      });
      return NextResponse.redirect(`${baseUrl}/support/login?error=Configuration`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Fetch user info
    const userResponse = await fetch(DISCORD_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      logAuthAttempt({
        success: false,
        method: 'discord',
        details: { error: 'user_fetch_failed' },
      });
      return NextResponse.redirect(`${baseUrl}/support/login?error=Configuration`);
    }

    const discordUser: DiscordUser = await userResponse.json();

    // Fetch user guilds (optional, for server selection)
    let guilds: DiscordGuild[] = [];
    try {
      const guildsResponse = await fetch(DISCORD_GUILDS_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (guildsResponse.ok) {
        guilds = await guildsResponse.json();
      }
    } catch {
      // Guilds fetch is optional
    }

    // Create session token
    const sessionToken = createSessionToken({
      userId: discordUser.id,
      provider: 'discord',
      data: {
        username: discordUser.global_name || discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : null,
        guildCount: guilds.length,
      },
    });

    // Log successful auth
    logAuthAttempt({
      success: true,
      method: 'discord',
      userId: discordUser.id,
      details: { username: discordUser.username },
    });

    // Create response with redirect
    const response = NextResponse.redirect(`${baseUrl}${callbackUrl}`);

    // Set session cookie
    response.cookies.set(SESSION_COOKIE_CONFIG.name, sessionToken, {
      httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
      secure: SESSION_COOKIE_CONFIG.secure,
      sameSite: SESSION_COOKIE_CONFIG.sameSite,
      path: SESSION_COOKIE_CONFIG.path,
      maxAge: SESSION_COOKIE_CONFIG.maxAge,
    });

    // Clear OAuth state cookies
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_callback');

    return response;
  } catch {
    logAuthAttempt({
      success: false,
      method: 'discord',
      details: { error: 'callback_failed' },
    });
    return NextResponse.redirect(`${baseUrl}/support/login?error=Configuration`);
  }
}
