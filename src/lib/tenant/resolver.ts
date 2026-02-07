/**
 * Tenant Resolver
 *
 * Resolves tenant from subdomain and provides tenant context.
 * Used by middleware and server components.
 */

import { headers } from 'next/headers';
import { prisma } from '@/lib/db/client';
import { decryptFromString } from '@/lib/security/crypto';
import type { Tenant, TenantHygraphConfig, TenantJiraConfig, TenantFeatures, TenantBranding } from '@/generated/prisma';

// Tenant with all relations loaded
export interface TenantWithConfig extends Tenant {
  hygraphConfig: TenantHygraphConfig | null;
  jiraConfig: TenantJiraConfig | null;
  features: TenantFeatures | null;
  branding: TenantBranding | null;
}

// Decrypted tenant config for use in app
export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  hygraph: {
    endpoint: string;
    token: string;
  } | null;
  jira: {
    connected: boolean;
    cloudId: string | null;
    cloudUrl: string | null;
    serviceDeskId: string | null;
    requestTypeId: string | null;
    projectKey: string | null;
  } | null;
  features: {
    articlesEnabled: boolean;
    servicesEnabled: boolean;
    ticketsEnabled: boolean;
    discordLoginEnabled: boolean;
    tipsEnabled: boolean;
  };
  branding: {
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string | null;
    theme: string | null;  // Theme ID: "dark", "light", "spooky"
    customDomain: string | null;
  } | null;
}

// Simple in-memory cache for tenant lookups (short TTL)
const tenantCache = new Map<string, { tenant: TenantWithConfig | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract subdomain from hostname
 */
export function extractSubdomain(hostname: string): string | null {
  // Handle localhost development
  if (hostname.includes('localhost')) {
    // For local dev, use query param via middleware header
    return null;
  }

  // Extract subdomain from hostname
  // e.g., "acme.helpportal.app" → "acme"
  // e.g., "www.helpportal.app" → null (main site)
  const parts = hostname.split('.');

  // Need at least 3 parts for subdomain (sub.domain.tld)
  if (parts.length >= 3) {
    const subdomain = parts[0];

    // Ignore common non-tenant subdomains
    if (['www', 'app', 'api', 'admin', 'mail', 'smtp'].includes(subdomain)) {
      return null;
    }

    return subdomain;
  }

  return null;
}

/**
 * Get tenant from database by slug
 */
export async function getTenantBySlug(slug: string): Promise<TenantWithConfig | null> {
  // Check cache
  const cached = tenantCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenant;
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        hygraphConfig: true,
        jiraConfig: true,
        features: true,
        branding: true,
      },
    });

    // Cache result (even if null)
    tenantCache.set(slug, { tenant, timestamp: Date.now() });

    return tenant;
  } catch {
    console.error('[Tenant] Error fetching tenant');
    return null;
  }
}

/**
 * Get tenant from request headers (set by middleware)
 */
export async function getTenantFromRequest(): Promise<TenantContext | null> {
  const headersList = await headers();
  const slug = headersList.get('x-tenant-slug');

  if (!slug) {
    return null;
  }

  const tenant = await getTenantBySlug(slug);

  if (!tenant || tenant.status !== 'ACTIVE') {
    return null;
  }

  return transformTenantToContext(tenant);
}

/**
 * Transform database tenant to context with decrypted values
 */
export function transformTenantToContext(tenant: TenantWithConfig): TenantContext {
  // Decrypt Hygraph config if present
  let hygraph: TenantContext['hygraph'] = null;
  if (tenant.hygraphConfig) {
    try {
      hygraph = {
        endpoint: decryptFromString(tenant.hygraphConfig.endpoint),
        token: decryptFromString(tenant.hygraphConfig.token),
      };
    } catch {
      console.error('[Tenant] Failed to decrypt Hygraph config for:', tenant.slug);
    }
  }

  // Jira config (tokens not decrypted here - done when needed)
  let jira: TenantContext['jira'] = null;
  if (tenant.jiraConfig) {
    jira = {
      connected: tenant.jiraConfig.connected,
      cloudId: tenant.jiraConfig.cloudId,
      cloudUrl: tenant.jiraConfig.cloudUrl,
      serviceDeskId: tenant.jiraConfig.serviceDeskId,
      requestTypeId: tenant.jiraConfig.requestTypeId,
      projectKey: tenant.jiraConfig.projectKey,
    };
  }

  // Features with defaults
  const features = tenant.features ?? {
    articlesEnabled: true,
    servicesEnabled: true,
    ticketsEnabled: true,
    discordLoginEnabled: true,
    tipsEnabled: false,
  };

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    plan: tenant.plan,
    hygraph,
    jira,
    features: {
      articlesEnabled: features.articlesEnabled,
      servicesEnabled: features.servicesEnabled,
      ticketsEnabled: features.ticketsEnabled,
      discordLoginEnabled: features.discordLoginEnabled,
      tipsEnabled: features.tipsEnabled,
    },
    branding: tenant.branding
      ? {
          logoUrl: tenant.branding.logoUrl,
          faviconUrl: tenant.branding.faviconUrl,
          primaryColor: tenant.branding.primaryColor,
          theme: tenant.branding.theme,
          customDomain: tenant.branding.customDomain,
        }
      : null,
  };
}

/**
 * Check if a slug is available for registration
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  // Reserved slugs
  const reserved = ['www', 'app', 'api', 'admin', 'mail', 'smtp', 'support', 'help', 'billing', 'demo', 'test'];
  if (reserved.includes(slug.toLowerCase())) {
    return false;
  }

  // Check database
  const existing = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  return !existing;
}

/**
 * Clear tenant cache (called by webhook on CMS update)
 */
export function clearTenantCache(slug?: string): void {
  if (slug) {
    tenantCache.delete(slug);
  } else {
    tenantCache.clear();
  }
}
