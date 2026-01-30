/**
 * Discord OAuth Utilities
 *
 * Handles Discord OAuth operations like token revocation.
 */

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REVOKE_URL = 'https://discord.com/api/oauth2/token/revoke';

/**
 * Revoke a Discord OAuth access token
 *
 * Should be called on logout to invalidate the token on Discord's side.
 * This prevents the token from being reused if it was somehow leaked.
 *
 * @param accessToken - The Discord access token to revoke
 * @returns true if revocation succeeded, false otherwise
 */
export async function revokeDiscordToken(accessToken: string): Promise<boolean> {
  if (!accessToken) {
    return false;
  }

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.warn('[Discord OAuth] Cannot revoke token: missing client credentials');
    return false;
  }

  try {
    // Discord requires application/x-www-form-urlencoded content type
    // and the token field must be named "token" (not "access_token")
    const response = await fetch(DISCORD_REVOKE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: accessToken,
        token_type_hint: 'access_token',
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
      }),
    });

    // Discord returns 200 OK even if the token was already revoked or invalid
    // This is per OAuth 2.0 spec (RFC 7009)
    if (response.ok) {
      console.log('[Discord OAuth] Token revoked successfully');
      return true;
    }

    // Log error but don't throw - logout should still proceed
    console.error('[Discord OAuth] Token revocation failed:', response.status);
    return false;
  } catch {
    // Network errors shouldn't block logout
    console.error('[Discord OAuth] Token revocation error');
    return false;
  }
}

/**
 * Check if Discord OAuth is configured
 */
export function isDiscordConfigured(): boolean {
  return !!(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);
}
