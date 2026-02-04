/**
 * Background Atlassian OAuth Token Refresh
 *
 * Runs inside the Node.js process on a 12-hour interval.
 * Proactively refreshes OAuth tokens for all connected tenants so the
 * 90-day refresh token expiry never triggers.
 *
 * Each refresh rotates both tokens, resetting the 90-day window.
 * Tenants whose tokens were refreshed in the last 7 days are skipped.
 *
 * Uses globalThis singleton to survive HMR in development.
 */

import { prisma } from '@/lib/db/client';
import { encryptToString } from '@/lib/security/crypto';
import { refreshAccessToken, isAtlassianOAuthConfigured } from '@/lib/atlassian/oauth';

const REFRESH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
const SKIP_IF_REFRESHED_WITHIN_DAYS = 7;
const GLOBAL_KEY = '__atlassianTokenRefreshTimer';

async function refreshAllTokens() {
  if (!isAtlassianOAuthConfigured()) return;

  try {
    const configs = await prisma.tenantJiraConfig.findMany({
      where: {
        authMode: 'oauth',
        connected: true,
        refreshToken: { not: null },
      },
      select: {
        tenantId: true,
        refreshToken: true,
        updatedAt: true,
      },
    });

    if (configs.length === 0) return;

    let refreshed = 0;
    let failed = 0;

    for (const config of configs) {
      // Skip if refreshed recently
      const daysSinceUpdate =
        (Date.now() - new Date(config.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < SKIP_IF_REFRESHED_WITHIN_DAYS) continue;

      try {
        const result = await refreshAccessToken(config.refreshToken!);

        await prisma.tenantJiraConfig.update({
          where: { tenantId: config.tenantId },
          data: {
            accessToken: encryptToString(result.access_token),
            refreshToken: encryptToString(result.refresh_token),
            tokenExpiry: new Date(Date.now() + result.expires_in * 1000),
          },
        });
        refreshed++;
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Token Refresh] Failed for tenant ${config.tenantId}:`, msg);

        // Expired refresh token — mark disconnected
        if (msg.includes('400') || msg.includes('401')) {
          await prisma.tenantJiraConfig.update({
            where: { tenantId: config.tenantId },
            data: { connected: false },
          });
          console.warn(`[Token Refresh] Marked tenant ${config.tenantId} as disconnected`);
        }
      }
    }

    if (refreshed > 0 || failed > 0) {
      console.log(`[Token Refresh] Done: ${refreshed} refreshed, ${failed} failed`);
    }
  } catch (err) {
    console.error('[Token Refresh] Unexpected error:', err);
  }
}

/**
 * Start the background token refresh timer.
 * Safe to call multiple times — only one timer will exist.
 */
export function startTokenRefresh(): void {
  const g = globalThis as Record<string, unknown>;
  if (g[GLOBAL_KEY]) return;

  // Run once shortly after startup (30 seconds), then every 12 hours
  const initialTimeout = setTimeout(() => {
    refreshAllTokens();
  }, 30 * 1000);
  if (initialTimeout.unref) initialTimeout.unref();

  const interval = setInterval(refreshAllTokens, REFRESH_INTERVAL);
  if (interval.unref) interval.unref();

  g[GLOBAL_KEY] = interval;
  console.log('[Token Refresh] Background refresh started (every 12h)');
}
