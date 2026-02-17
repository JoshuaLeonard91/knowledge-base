/**
 * Generic OAuth Token Revocation
 *
 * Dispatches to provider-specific revocation endpoints.
 */

import { revokeDiscordToken } from '@/lib/discord/oauth';

/**
 * Revoke an OAuth access token for any supported provider.
 * Non-blocking — errors are logged but don't throw.
 */
export async function revokeProviderToken(provider: string, accessToken: string): Promise<void> {
  if (!accessToken) return;

  switch (provider) {
    case 'discord':
      await revokeDiscordToken(accessToken);
      break;

    case 'google':
      // Google: POST https://oauth2.googleapis.com/revoke?token={token}
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch {
        console.error('[OAuth Revoke] Google token revocation failed');
      }
      break;

    case 'github': {
      // GitHub: DELETE https://api.github.com/applications/{client_id}/token
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (clientId && clientSecret) {
        try {
          await fetch(`https://api.github.com/applications/${clientId}/token`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ access_token: accessToken }),
          });
        } catch {
          console.error('[OAuth Revoke] GitHub token revocation failed');
        }
      }
      break;
    }

    default:
      console.warn(`[OAuth Revoke] Unknown provider: ${provider}`);
  }
}
