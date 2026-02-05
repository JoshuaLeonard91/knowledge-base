/**
 * Ticket Provider Adapter
 *
 * Factory that returns the correct ticket provider based on
 * tenant configuration. Currently supports Jira.
 *
 * Supports two auth modes per tenant:
 * - "oauth": Uses Atlassian OAuth 2.0 (3LO) tokens with automatic refresh
 * - "api_token": Uses email + API token via Basic Auth (legacy / main domain)
 *
 * Usage:
 *   const provider = getTicketProvider();                    // Default (Jira via env vars)
 *   const provider = await getTicketProviderForTenant(id);   // Per-tenant lookup
 */

import type { TicketProvider } from './types';
import { JiraTicketProvider } from './providers/jira';
import { JiraServiceDeskClient } from '@/lib/atlassian/client';
import { decryptFromString, encryptToString } from '@/lib/security/crypto';
import { refreshAccessToken } from '@/lib/atlassian/oauth';
import { prisma } from '@/lib/db/client';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

// Default provider (uses env vars — for main domain)
const defaultProvider = new JiraTicketProvider();

// Cache per-tenant providers so we don't decrypt + instantiate on every request
const tenantProviderCache = new Map<string, { provider: JiraTicketProvider; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OAUTH_CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes (shorter for OAuth — tokens expire hourly)

/**
 * Invalidate the cached provider for a tenant.
 * Call this when credentials are updated (OAuth reconnect, token rotation, disconnect).
 */
export function invalidateTenantProviderCache(tenantId: string): void {
  tenantProviderCache.delete(tenantId);
  console.log(`[Adapter] Cache invalidated for tenant ${tenantId}`);
}

/**
 * Get the default ticket provider (Jira via environment config).
 * Used by the main domain (no tenant context).
 */
export function getTicketProvider(): TicketProvider {
  return defaultProvider;
}

/**
 * Get the ticket provider for a specific tenant.
 * Handles both OAuth and API token auth modes.
 * For OAuth, transparently refreshes expired tokens.
 *
 * Returns null if no provider is configured or connected.
 */
export async function getTicketProviderForTenant(
  tenantId: string
): Promise<TicketProvider | null> {
  // Check cache first
  const cached = tenantProviderCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.provider;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      jiraConfig: true,
    },
  });

  if (!tenant) return null;

  const config = tenant.jiraConfig;
  if (!config?.connected || !config.accessToken || !config.refreshToken) {
    return null;
  }

  try {
    let client: JiraServiceDeskClient;
    let cacheTtl: number;

    if (config.authMode === 'oauth') {
      // --- OAuth path ---
      if (!config.cloudId) return null;

      let accessToken = decryptFromString(config.accessToken);

      // Check if token is expired or about to expire (5-minute buffer)
      const isExpired = config.tokenExpiry &&
        new Date(config.tokenExpiry) <= new Date(Date.now() + 5 * 60 * 1000);

      if (isExpired) {
        try {
          const refreshed = await refreshAccessToken(config.refreshToken);
          accessToken = refreshed.access_token;

          // Persist new tokens
          await prisma.tenantJiraConfig.update({
            where: { tenantId },
            data: {
              accessToken: encryptToString(refreshed.access_token),
              refreshToken: encryptToString(refreshed.refresh_token),
              tokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
            },
          });

          console.log(`[Adapter] Refreshed OAuth token for tenant ${tenantId}`);
        } catch (refreshError) {
          console.error(`[Adapter] Token refresh failed for tenant ${tenantId}:`, refreshError);
          // Mark as disconnected so UI can prompt reconnection
          await prisma.tenantJiraConfig.update({
            where: { tenantId },
            data: { connected: false },
          });
          tenantProviderCache.delete(tenantId);
          return null;
        }
      }

      client = new JiraServiceDeskClient({
        cloudId: config.cloudId,
        oauthAccessToken: accessToken,
        serviceDeskId: config.serviceDeskId || undefined,
        requestTypeId: config.requestTypeId || undefined,
        projectKey: config.projectKey || undefined,
      });

      cacheTtl = OAUTH_CACHE_TTL_MS;
    } else {
      // --- Legacy API token path ---
      if (!config.cloudUrl) return null;

      const apiToken = decryptFromString(config.accessToken);
      const email = decryptFromString(config.refreshToken);
      const domain = config.cloudUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

      client = new JiraServiceDeskClient({
        domain,
        email,
        apiToken,
        serviceDeskId: config.serviceDeskId || undefined,
        requestTypeId: config.requestTypeId || undefined,
        projectKey: config.projectKey || undefined,
      });

      cacheTtl = CACHE_TTL_MS;
    }

    const provider = new JiraTicketProvider(client);

    // Cache it
    tenantProviderCache.set(tenantId, {
      provider,
      expiresAt: Date.now() + cacheTtl,
    });

    return provider;
  } catch (error) {
    console.error(`[Adapter] Failed to create provider for tenant ${tenantId}:`, error);
    return null;
  }
}

/**
 * Resolve the correct ticket provider from the current request context.
 * Uses tenant subdomain (via middleware header) to determine which
 * Jira workspace to use. Never falls back from tenant to main domain.
 */
export async function resolveProviderFromRequest(): Promise<{
  provider: TicketProvider | null;
  tenantId: string | null;
  error?: string;
}> {
  const tenant = await getTenantFromRequest();

  if (tenant) {
    const provider = await getTicketProviderForTenant(tenant.id);
    if (!provider) {
      return {
        provider: null,
        tenantId: tenant.id,
        error: 'Ticketing is not configured for this workspace.',
      };
    }
    return { provider, tenantId: tenant.id };
  }

  // Main domain
  const provider = getTicketProvider();
  return {
    provider: provider.isAvailable() ? provider : null,
    tenantId: null,
  };
}

// Re-export types for convenience
export type { TicketProvider } from './types';
export type {
  CreateTicketInput,
  CreateTicketResult,
  TicketListItem,
  Ticket,
  AddCommentInput,
  TicketComment,
} from './types';
