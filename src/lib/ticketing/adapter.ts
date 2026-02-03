/**
 * Ticket Provider Adapter
 *
 * Factory that returns the correct ticket provider based on
 * tenant configuration. Currently supports Jira.
 *
 * Usage:
 *   const provider = getTicketProvider();                    // Default (Jira via env vars)
 *   const provider = await getTicketProviderForTenant(id);   // Per-tenant lookup
 */

import type { TicketProvider } from './types';
import { JiraTicketProvider } from './providers/jira';
import { JiraServiceDeskClient } from '@/lib/atlassian/client';
import { decryptFromString } from '@/lib/security/crypto';
import { prisma } from '@/lib/db/client';

// Default provider (uses env vars — for main domain)
const defaultProvider = new JiraTicketProvider();

// Cache per-tenant providers so we don't decrypt + instantiate on every request
const tenantProviderCache = new Map<string, { provider: JiraTicketProvider; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the default ticket provider (Jira via environment config).
 * Used by the main domain (no tenant context).
 */
export function getTicketProvider(): TicketProvider {
  return defaultProvider;
}

/**
 * Get the ticket provider for a specific tenant.
 * Decrypts the tenant's stored Jira credentials and returns
 * a provider instance pointing to their Jira workspace.
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
  if (!config?.connected || !config.cloudUrl || !config.accessToken || !config.refreshToken) {
    return null;
  }

  try {
    // Decrypt stored credentials
    // accessToken = encrypted API token, refreshToken = encrypted email
    const apiToken = decryptFromString(config.accessToken);
    const email = decryptFromString(config.refreshToken);

    // Normalize domain from cloudUrl (e.g., "https://acme.atlassian.net" → "acme.atlassian.net")
    const domain = config.cloudUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const client = new JiraServiceDeskClient({
      domain,
      email,
      apiToken,
      serviceDeskId: config.serviceDeskId || undefined,
      requestTypeId: config.requestTypeId || undefined,
    });

    const provider = new JiraTicketProvider(client);

    // Cache it
    tenantProviderCache.set(tenantId, {
      provider,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return provider;
  } catch (error) {
    console.error(`[Adapter] Failed to create provider for tenant ${tenantId}:`, error);
    return null;
  }
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
