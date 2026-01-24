/**
 * Custom Discord OAuth Callback Handler
 *
 * Exchanges authorization code for tokens and creates session.
 * Redirects back to the tenant subdomain after successful auth.
 *
 * Flow:
 * 1. User on tenant subdomain (e.g., donuts.helpportal.app) clicks "Login with Discord"
 * 2. Redirected to main domain OAuth callback (helpportal.app/api/auth/callback/discord)
 * 3. After auth, redirect back to tenant subdomain with session cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionToken, createHandoffToken } from '@/lib/security/session';
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

  // AUTH_URL is the main domain used for OAuth callback
  const authBaseUrl = process.env.AUTH_URL || 'http://localhost:3000';

  // Get callback URL and original tenant origin (needed for all redirects)
  const callbackUrl = cookieStore.get('oauth_callback')?.value || '/support';
  const tenantOrigin = cookieStore.get('oauth_origin')?.value || authBaseUrl;

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
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=AccessDenied`);
  }

  // Verify code exists
  if (!code) {
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=Configuration`);
  }

  // Verify state (CSRF protection)
  const storedState = cookieStore.get('oauth_state')?.value;
  if (!storedState || storedState !== state) {
    logAuthAttempt({
      success: false,
      method: 'discord',
      details: {
        error: 'state_mismatch',
        hasStoredState: !!storedState,
        statesMatch: storedState === state,
        tenantOrigin,
        authCookieDomain: process.env.AUTH_COOKIE_DOMAIN || 'NOT_SET',
      },
    });
    // Include debug info in error
    const debugError = !storedState ? 'StateMissing' : 'StateMismatch';
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=${debugError}`);
  }

  try {
    // Exchange code for tokens (always use main domain for redirect_uri)
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
        redirect_uri: `${authBaseUrl}/api/auth/callback/discord`,
      }),
    });

    if (!tokenResponse.ok) {
      logAuthAttempt({
        success: false,
        method: 'discord',
        details: {
          error: 'token_exchange_failed',
          status: tokenResponse.status,
          authUrl: authBaseUrl,
          redirectUri: `${authBaseUrl}/api/auth/callback/discord`,
        },
      });
      return NextResponse.redirect(`${tenantOrigin}/support/login?error=TokenExchangeFailed`);
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
      return NextResponse.redirect(`${tenantOrigin}/support/login?error=Configuration`);
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

    // Create session token (include access token for revocation on logout)
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
        // Store access token (encrypted in session) for revocation on logout
        accessToken: accessToken,
      },
    });

    // Log successful auth
    logAuthAttempt({
      success: true,
      method: 'discord',
      userId: discordUser.id,
      details: { username: discordUser.username },
    });

    // Create short-lived handoff token (expires in 30 seconds)
    // This prevents the actual session token from being logged in URLs
    const handoffToken = createHandoffToken(sessionToken);

    // Redirect to subdomain's set-session endpoint to set cookie there
    // This ensures the session cookie is subdomain-specific (no cross-subdomain sharing)
    const setSessionUrl = new URL('/api/auth/set-session', tenantOrigin);
    setSessionUrl.searchParams.set('token', handoffToken);
    setSessionUrl.searchParams.set('callback', callbackUrl);

    const response = NextResponse.redirect(setSessionUrl.toString());

    // Clear OAuth state cookies (must specify domain since they were set with domain)
    const oauthCookieDomain = process.env.AUTH_COOKIE_DOMAIN;
    const deleteOptions = {
      path: '/',
      ...(process.env.NODE_ENV === 'production' && oauthCookieDomain
        ? { domain: oauthCookieDomain }
        : {}),
    };

    response.cookies.set('oauth_state', '', { ...deleteOptions, maxAge: 0 });
    response.cookies.set('oauth_callback', '', { ...deleteOptions, maxAge: 0 });
    response.cookies.set('oauth_origin', '', { ...deleteOptions, maxAge: 0 });

    return response;
  } catch {
    logAuthAttempt({
      success: false,
      method: 'discord',
      details: { error: 'callback_failed' },
    });
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=Configuration`);
  }
}
