/**
 * Generic OAuth Redirect Route
 *
 * GET /api/auth/:provider
 *
 * Initiates OAuth flow for any configured provider (discord, google, github).
 * Uses AUTH_URL (main domain) for OAuth callback, then redirects back to tenant subdomain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { getProvider } from '@/lib/oauth/providers';

function generateState(): string {
  const random = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  return `${random}.${timestamp}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params;
  const providerConfig = getProvider(providerName);

  if (!providerConfig) {
    return NextResponse.json(
      { error: `Provider "${providerName}" is not configured` },
      { status: 400 }
    );
  }

  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/support';

  // AUTH_URL = main domain (registered in OAuth provider settings)
  const authBaseUrl = process.env.AUTH_URL || 'http://localhost:3000';

  // Get the current origin (could be tenant subdomain)
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const currentOrigin = `${forwardedProto}://${forwardedHost}`;

  // Generate state for CSRF protection
  const state = generateState();

  // Store state, callbackUrl, origin, and provider for redirect after auth
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 10, // 10 minutes
    path: '/',
    ...(process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_DOMAIN
      ? { domain: process.env.AUTH_COOKIE_DOMAIN }
      : {}),
  };

  cookieStore.set('oauth_state', state, cookieOptions);
  cookieStore.set('oauth_callback', callbackUrl, cookieOptions);
  cookieStore.set('oauth_origin', currentOrigin, cookieOptions);
  cookieStore.set('oauth_provider', providerName, cookieOptions);

  // Construct OAuth authorize URL
  const authorizeUrl = new URL(providerConfig.authorizeUrl);
  authorizeUrl.searchParams.set('client_id', providerConfig.clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${authBaseUrl}/api/auth/callback/${providerName}`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', providerConfig.scopes.join(' '));
  authorizeUrl.searchParams.set('state', state);

  // Add provider-specific params (e.g. Google's access_type=offline)
  if (providerConfig.extraAuthorizeParams) {
    for (const [key, value] of Object.entries(providerConfig.extraAuthorizeParams)) {
      authorizeUrl.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(authorizeUrl.toString());
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  return GET(request, context);
}
