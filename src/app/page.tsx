/**
 * Root Page
 *
 * - Main domain: Shows the marketing landing page (CMS-driven)
 * - Tenant subdomain: Shows landing page if configured, otherwise redirects to /support
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

  // Tenant subdomain - check for optional landing page
  if (tenant) {
    const [tenantLandingContent, tenantHeaderData] = await Promise.all([
      getLandingPageContentOrNull(),
      getHeaderData(),
    ]);

    // No landing page configured - redirect to support hub
    if (!tenantLandingContent) {
      redirect('/support');
    }

    const siteName = tenantHeaderData.settings.siteName || tenant.name || 'Help Center';
    const hasTicketing = tenant.jira?.connected ?? false;

    // Tenant landing page
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <LandingPageHeader
          siteName={siteName}
          isMainDomain={false}
          hasContactPage={tenantHeaderData.hasContactPage}
          hasTicketing={hasTicketing}
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
