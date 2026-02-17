/**
 * Generic OAuth Callback Handler
 *
 * GET /api/auth/callback/:provider
 *
 * Exchanges authorization code for tokens, fetches user info,
 * finds or creates User + OAuthIdentity, creates session,
 * and redirects back to the tenant subdomain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionToken, createHandoffToken } from '@/lib/security/session';
import { logAuthAttempt } from '@/lib/security/logger';
import { getProvider } from '@/lib/oauth/providers';
import { prisma } from '@/lib/db/client';

const STATE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params;
  const providerConfig = getProvider(providerName);
  const cookieStore = await cookies();

  // AUTH_URL is the main domain used for OAuth callback
  const authBaseUrl = process.env.AUTH_URL || 'http://localhost:3000';

  // Get callback URL and original tenant origin
  const callbackUrl = cookieStore.get('oauth_callback')?.value || '/support';
  const rawTenantOrigin = cookieStore.get('oauth_origin')?.value || authBaseUrl;

  // Validate tenantOrigin to prevent open redirects
  const appDomain = process.env.APP_DOMAIN || 'helpportal.app';
  let tenantOrigin = authBaseUrl;
  try {
    const parsed = new URL(rawTenantOrigin);
    const isAllowed = parsed.hostname === appDomain
      || parsed.hostname.endsWith(`.${appDomain}`)
      || parsed.hostname === 'localhost';
    if (isAllowed) {
      tenantOrigin = rawTenantOrigin;
    }
  } catch {
    // Invalid URL — use safe default
  }

  // Provider not configured
  if (!providerConfig) {
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=ProviderNotConfigured`);
  }

  // Get code and state from query params
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  // Handle errors from provider
  if (error) {
    logAuthAttempt({
      success: false,
      method: providerName,
      details: { error: 'access_denied' },
    });
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=AccessDenied`);
  }

  if (!code) {
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=Configuration`);
  }

  // Verify state (CSRF protection)
  const storedState = cookieStore.get('oauth_state')?.value;
  if (!storedState || storedState !== state) {
    logAuthAttempt({
      success: false,
      method: providerName,
      details: { error: 'state_mismatch', tenantOrigin },
    });
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=InvalidState`);
  }

  // Validate state expiration
  const stateParts = state!.split('.');
  if (stateParts.length === 2) {
    const stateTimestamp = parseInt(stateParts[1], 36);
    if (isNaN(stateTimestamp) || Date.now() - stateTimestamp > STATE_MAX_AGE_MS) {
      logAuthAttempt({
        success: false,
        method: providerName,
        details: { error: 'state_expired', tenantOrigin },
      });
      return NextResponse.redirect(`${tenantOrigin}/support/login?error=StateExpired`);
    }
  }

  try {
    // Exchange code for tokens
    const tokenBody: Record<string, string> = {
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${authBaseUrl}/api/auth/callback/${providerName}`,
    };

    // GitHub expects Accept: application/json
    const tokenHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (providerName === 'github') {
      tokenHeaders['Accept'] = 'application/json';
    }

    const tokenResponse = await fetch(providerConfig.tokenUrl, {
      method: 'POST',
      headers: tokenHeaders,
      body: new URLSearchParams(tokenBody),
    });

    if (!tokenResponse.ok) {
      logAuthAttempt({
        success: false,
        method: providerName,
        details: { error: 'token_exchange_failed', status: tokenResponse.status },
      });
      return NextResponse.redirect(`${tenantOrigin}/support/login?error=TokenExchangeFailed`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${tenantOrigin}/support/login?error=NoAccessToken`);
    }

    // Fetch user info from provider
    const userResponse = await fetch(providerConfig.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(providerName === 'github' ? { 'Accept': 'application/vnd.github+json' } : {}),
      },
    });

    if (!userResponse.ok) {
      logAuthAttempt({
        success: false,
        method: providerName,
        details: { error: 'user_fetch_failed' },
      });
      return NextResponse.redirect(`${tenantOrigin}/support/login?error=Configuration`);
    }

    const userData = await userResponse.json();
    const extractedUser = providerConfig.extractUser(userData);

    // For GitHub: fetch email separately if not public
    if (providerName === 'github' && !extractedUser.email) {
      try {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        });
        if (emailRes.ok) {
          const emails = await emailRes.json();
          const primary = emails.find((e: { primary: boolean; verified: boolean; email: string }) =>
            e.primary && e.verified
          );
          if (primary) {
            extractedUser.email = primary.email;
          }
        }
      } catch {
        // Email fetch is optional
      }
    }

    // Find or create User + OAuthIdentity
    const existingIdentity = await prisma.oAuthIdentity.findUnique({
      where: {
        provider_providerId: {
          provider: providerName,
          providerId: extractedUser.providerId,
        },
      },
    });

    let userId: string;

    if (!existingIdentity) {
      // Create new user + identity
      const newUser = await prisma.user.create({
        data: {
          displayName: extractedUser.username,
          avatarUrl: extractedUser.avatar,
          email: extractedUser.email,
          discordId: providerName === 'discord' ? extractedUser.providerId : null,
          oauthIdentity: {
            create: {
              provider: providerName,
              providerId: extractedUser.providerId,
              username: extractedUser.username,
              avatar: extractedUser.avatar,
              email: extractedUser.email,
            },
          },
        },
      });
      userId = newUser.id;
    } else {
      userId = existingIdentity.userId;
      // Update display info on login
      await prisma.$transaction([
        prisma.oAuthIdentity.update({
          where: { id: existingIdentity.id },
          data: {
            username: extractedUser.username,
            avatar: extractedUser.avatar,
            email: extractedUser.email,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            displayName: extractedUser.username,
            avatarUrl: extractedUser.avatar,
          },
        }),
      ]);
    }

    // Create session token with User.id (not provider ID)
    const sessionToken = createSessionToken({
      userId,
      provider: providerName as 'discord' | 'google' | 'github',
      data: {
        displayName: extractedUser.username,
        avatar: extractedUser.avatar,
        email: extractedUser.email,
        accessToken,
      },
    });

    logAuthAttempt({
      success: true,
      method: providerName,
      userId,
      details: { username: extractedUser.username },
    });

    // Create short-lived handoff token
    const handoffToken = createHandoffToken(sessionToken);

    // Redirect to subdomain's set-session endpoint
    const setSessionUrl = new URL('/api/auth/set-session', tenantOrigin);
    setSessionUrl.searchParams.set('token', handoffToken);
    setSessionUrl.searchParams.set('callback', callbackUrl);

    const response = NextResponse.redirect(setSessionUrl.toString());

    // Clear OAuth state cookies
    const oauthCookieDomain = process.env.AUTH_COOKIE_DOMAIN;
    const deleteOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      ...(process.env.NODE_ENV === 'production' && oauthCookieDomain
        ? { domain: oauthCookieDomain }
        : {}),
    };

    response.cookies.set('oauth_state', '', { ...deleteOptions, maxAge: 0 });
    response.cookies.set('oauth_callback', '', { ...deleteOptions, maxAge: 0 });
    response.cookies.set('oauth_origin', '', { ...deleteOptions, maxAge: 0 });
    response.cookies.set('oauth_provider', '', { ...deleteOptions, maxAge: 0 });

    return response;
  } catch (err) {
    console.error(`[OAuth Callback] ${providerName} error:`, err);
    logAuthAttempt({
      success: false,
      method: providerName,
      details: { error: 'callback_failed' },
    });
    return NextResponse.redirect(`${tenantOrigin}/support/login?error=Configuration`);
  }
}
