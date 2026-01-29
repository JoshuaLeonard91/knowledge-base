/**
 * Root Page
 *
 * - Main domain: Shows the marketing landing page (CMS-driven with defaults)
 * - Tenant subdomain with own CMS: Shows landing page if configured, otherwise redirects to /support
 * - Tenant subdomain sharing main CMS: Shows landing page (same behavior as main domain)
 *
 * Both use the same shared landing page components with CSS variables for theming.
 */

import { redirect } from 'next/navigation';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { getHeaderData, getLandingPageContent, getLandingPageContentOrNull } from '@/lib/cms';
import { LandingPageContent, LandingPageHeader, LandingPageFooter } from '@/components/landing';

export default async function RootPage() {
  // Check if we're on a tenant subdomain
  const tenant = await getTenantFromRequest();

  // Tenant subdomain
  if (tenant) {
    // Check if tenant has their own Hygraph CMS or uses default (main domain's CMS)
    const hasOwnCms = !!(tenant.hygraph?.endpoint && tenant.hygraph?.token);

    // Get landing page content
    // - Tenants with own CMS: use getLandingPageContentOrNull (landing page is optional)
    // - Tenants sharing main CMS: use getLandingPageContent (same defaults as main domain)
    const [tenantLandingContent, tenantHeaderData] = await Promise.all([
      hasOwnCms ? getLandingPageContentOrNull() : getLandingPageContent(),
      getHeaderData(),
    ]);

    // No landing page configured (only possible for tenants with own CMS)
    if (!tenantLandingContent) {
      redirect('/support');
    }

    const siteName = tenantHeaderData.settings.siteName || tenant.name || 'Help Center';

    // Tenant landing page
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <LandingPageHeader
          siteName={siteName}
          isMainDomain={false}
          hasContactPage={tenantHeaderData.hasContactPage}
        />
        <LandingPageContent content={tenantLandingContent} />
        <LandingPageFooter siteName={siteName} isMainDomain={false} />
      </div>
    );
  }

  // Main domain - show landing page
  const [headerData, content] = await Promise.all([
    getHeaderData(),
    getLandingPageContent(),
  ]);
  const siteName = headerData.settings.siteName || 'Help Portal';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <LandingPageHeader
        siteName={siteName}
        isMainDomain={true}
        hasContactPage={true}
      />
      <LandingPageContent content={content} showAnimations={true} />
      <LandingPageFooter siteName={siteName} isMainDomain={true} />
    </div>
  );
}
