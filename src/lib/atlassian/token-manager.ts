/**
 * Shared OAuth token management for Jira integration
 *
 * Provides a single getValidAccessToken function with a simple
 * per-tenant lock to prevent concurrent token refresh races.
 */

import { prisma } from '@/lib/db/client';
import { decryptFromString, encryptToString } from '@/lib/security/crypto';
import { refreshAccessToken } from '@/lib/atlassian/oauth';

interface TokenConfig {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date | null;
}

// Simple per-tenant lock to prevent concurrent refresh races
const refreshLocks = new Map<string, Promise<string | null>>();

/**
 * Get a valid OAuth access token for the tenant, refreshing if needed.
 * Uses a per-tenant lock so concurrent requests share a single refresh.
 */
export async function getValidAccessToken(config: TokenConfig): Promise<string | null> {
  console.log('[TokenManager] getValidAccessToken called for tenant:', config.tenantId);
  console.log('[TokenManager] Token expiry:', config.tokenExpiry, 'Now:', new Date());

  const accessToken = decryptFromString(config.accessToken);
  console.log('[TokenManager] Decrypted token length:', accessToken?.length || 0);

  const isExpired = config.tokenExpiry &&
    new Date(config.tokenExpiry) <= new Date(Date.now() + 5 * 60 * 1000);

  console.log('[TokenManager] Is expired:', isExpired);

  if (!isExpired) {
    console.log('[TokenManager] Token valid, returning');
    return accessToken;
  }

  // Check if a refresh is already in progress for this tenant
  const existing = refreshLocks.get(config.tenantId);
  if (existing) {
    return existing;
  }

  // Start a new refresh and store the promise
  const refreshPromise = doRefresh(config).finally(() => {
    refreshLocks.delete(config.tenantId);
  });

  refreshLocks.set(config.tenantId, refreshPromise);
  return refreshPromise;
}

async function doRefresh(config: TokenConfig): Promise<string | null> {
  try {
    const refreshed = await refreshAccessToken(config.refreshToken);

    await prisma.tenantJiraConfig.update({
      where: { tenantId: config.tenantId },
      data: {
        accessToken: encryptToString(refreshed.access_token),
        refreshToken: encryptToString(refreshed.refresh_token),
        tokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
      },
    });

    return refreshed.access_token;
  } catch {
    return null;
  }
}
