/**
 * Ticket Provider Adapter
 *
 * Factory that returns the correct ticket provider based on
 * tenant configuration. Supports Jira and Zendesk.
 *
 * Usage:
 *   const provider = getTicketProvider();                    // Default (Jira via env vars)
 *   const provider = await getTicketProviderForTenant(id);   // Per-tenant lookup
 */

import type { TicketProvider } from './types';
import { JiraTicketProvider } from './providers/jira';
import { ZendeskTicketProvider } from './providers/zendesk';
import { ZendeskClient } from '@/lib/zendesk/client';
import { prisma } from '@/lib/db/client';
import { decryptFromString } from '@/lib/security/crypto';

// Singleton Jira provider (uses env vars — stateless, safe to reuse)
const jiraProvider = new JiraTicketProvider();

/**
 * Get the default ticket provider (Jira via environment config).
 * Used by routes that don't yet have tenant context.
 */
export function getTicketProvider(): TicketProvider {
  return jiraProvider;
}

/**
 * Get the ticket provider for a specific tenant.
 * Looks up the tenant's configured provider and returns
 * the appropriate implementation with decrypted credentials.
 *
 * Returns null if no provider is configured.
 */
export async function getTicketProviderForTenant(
  tenantId: string
): Promise<TicketProvider | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      jiraConfig: true,
      zendeskConfig: true,
    },
  });

  if (!tenant) return null;

  // Check tenant's preferred provider
  if (tenant.ticketProvider === 'ZENDESK' && tenant.zendeskConfig?.connected) {
    const config = tenant.zendeskConfig;
    if (!config.subdomain || !config.email || !config.apiToken) return null;

    const client = new ZendeskClient({
      subdomain: config.subdomain,
      email: decryptFromString(config.email),
      apiToken: decryptFromString(config.apiToken),
    });

    return new ZendeskTicketProvider(client);
  }

  if (tenant.ticketProvider === 'JIRA' && tenant.jiraConfig?.connected) {
    // For tenant-specific Jira, we still use the global provider
    // since the Jira client reads from env vars. Per-tenant Jira
    // credentials would need the JiraTicketProvider to accept config.
    return jiraProvider;
  }

  // Fallback: if no provider preference, check what's configured
  if (tenant.zendeskConfig?.connected) {
    const config = tenant.zendeskConfig;
    if (config.subdomain && config.email && config.apiToken) {
      const client = new ZendeskClient({
        subdomain: config.subdomain,
        email: decryptFromString(config.email),
        apiToken: decryptFromString(config.apiToken),
      });
      return new ZendeskTicketProvider(client);
    }
  }

  if (tenant.jiraConfig?.connected) {
    return jiraProvider;
  }

  return null;
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
