/**
 * Tenant Module
 *
 * Multi-tenant support for the portal.
 */

// Server-side resolver
export {
  getTenantFromRequest,
  getTenantBySlug,
  extractSubdomain,
  isSlugAvailable,
  clearTenantCache,
  transformTenantToContext,
  type TenantContext,
  type TenantWithConfig,
} from './resolver';

// Client-side context
export {
  TenantProvider,
  useTenant,
  useRequiredTenant,
  useIsMainSite,
  type ClientTenantConfig,
} from './context';
