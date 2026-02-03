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
import { prisma } from '@/lib/db/client';

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
    },
  });

  if (!tenant) return null;

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
