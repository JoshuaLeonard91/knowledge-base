'use client';

/**
 * Tenant Context Provider
 *
 * Provides tenant configuration to client components.
 * Server components should use getTenantFromRequest() directly.
 */

import { createContext, useContext, ReactNode } from 'react';

// Client-safe tenant config (no sensitive data)
// NOTE: Do NOT add internal IDs, tokens, or sensitive configuration here
export interface ClientTenantConfig {
  slug: string;
  name: string;
  plan: string;
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
    theme: string | null;  // Theme ID: "dark", "light"
    // NOTE: customDomain excluded - internal config
  } | null;
  jiraConnected: boolean;
}

const TenantContext = createContext<ClientTenantConfig | null>(null);

interface TenantProviderProps {
  tenant: ClientTenantConfig | null;
  children: ReactNode;
}

/**
 * Wrap your app with TenantProvider to provide tenant context
 */
export function TenantProvider({ tenant, children }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to access tenant context
 * Returns null if no tenant (main site)
 */
export function useTenant(): ClientTenantConfig | null {
  return useContext(TenantContext);
}

/**
 * Hook to access tenant context (throws if no tenant)
 * Use this when you know you're on a tenant subdomain
 */
export function useRequiredTenant(): ClientTenantConfig {
  const tenant = useContext(TenantContext);
  if (!tenant) {
    throw new Error('useRequiredTenant must be used on a tenant subdomain');
  }
  return tenant;
}

/**
 * Check if we're on the main site (no tenant)
 */
export function useIsMainSite(): boolean {
  return useContext(TenantContext) === null;
}
