/**
 * Atlassian OAuth 2.0 (3LO) Utility Module
 *
 * Handles the three-legged OAuth flow for Jira Cloud:
 * - Authorization URL generation
 * - Code-to-token exchange
 * - Token refresh
 * - Accessible resources discovery (cloudId)
 *
 * Env vars: ATLASSIAN_OAUTH_CLIENT_ID, ATLASSIAN_OAUTH_CLIENT_SECRET
 */

import { decryptFromString } from '@/lib/security/crypto';

const ATLASSIAN_AUTH_URL = 'https://auth.atlassian.com/authorize';
const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const ATLASSIAN_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';

const SCOPES = [
  'offline_access',
  'read:jira-work',
  'write:jira-work',
  'manage:jira-configuration',
  'read:servicedesk:jira-service-management',
].join(' ');

function getClientCredentials() {
  const clientId = process.env.ATLASSIAN_OAUTH_CLIENT_ID;
  const clientSecret = process.env.ATLASSIAN_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('ATLASSIAN_OAUTH_CLIENT_ID and ATLASSIAN_OAUTH_CLIENT_SECRET must be set');
  }

  return { clientId, clientSecret };
}

/**
 * Check if Atlassian OAuth is configured
 */
export function isAtlassianOAuthConfigured(): boolean {
  return !!(process.env.ATLASSIAN_OAUTH_CLIENT_ID && process.env.ATLASSIAN_OAUTH_CLIENT_SECRET);
}

/**
 * Build the Atlassian OAuth consent URL
 */
export function getAuthorizeUrl(state: string, callbackUrl: string): string {
  const { clientId } = getClientCredentials();

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: callbackUrl,
    state,
    response_type: 'code',
    prompt: 'consent',
  });

  return `${ATLASSIAN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}> {
  const { clientId, clientSecret } = getClientCredentials();

  const response = await fetch(ATLASSIAN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Refresh an expired access token using an encrypted refresh token from the DB.
 * Returns new access + refresh tokens (Atlassian rotates refresh tokens on each use).
 */
export async function refreshAccessToken(encryptedRefreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const { clientId, clientSecret } = getClientCredentials();
  const refreshToken = decryptFromString(encryptedRefreshToken);

  const response = await fetch(ATLASSIAN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export interface AtlassianResource {
  id: string;       // cloudId
  url: string;      // e.g., https://acme.atlassian.net
  name: string;     // site display name
  scopes: string[];
  avatarUrl?: string;
}

/**
 * Get the Atlassian sites the user has granted access to.
 * The `id` field is the cloudId used in all subsequent API calls.
 */
export async function getAccessibleResources(
  accessToken: string
): Promise<AtlassianResource[]> {
  const response = await fetch(ATLASSIAN_RESOURCES_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Accessible resources failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Revoke an OAuth token (for disconnect flow)
 */
export async function revokeToken(encryptedRefreshToken: string): Promise<void> {
  const { clientId, clientSecret } = getClientCredentials();
  const refreshToken = decryptFromString(encryptedRefreshToken);

  try {
    await fetch('https://auth.atlassian.com/oauth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        token: refreshToken,
      }),
    });
  } catch {
    // Best-effort revocation — don't throw if it fails
    console.error('[Atlassian OAuth] Token revocation failed');
  }
}
