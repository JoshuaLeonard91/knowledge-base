/**
 * Root Page
 *
 * - Main domain: Shows the marketing landing page (CMS-driven)
 * - Tenant subdomain: Shows landing page if configured, otherwise redirects to /support
 *
 * Navbar + Footer provided by LayoutContent. Pages just render their content.
 */

import { redirect } from 'next/navigation';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { getLandingPageContent, getLandingPageContentOrNull } from '@/lib/cms';
import { LandingPageContent } from '@/components/landing';

export default async function RootPage() {
  const tenant = await getTenantFromRequest();

  // Tenant subdomain - check for optional landing page
  if (tenant) {
    const tenantLandingContent = await getLandingPageContentOrNull();

    // No landing page configured - redirect to support hub
    if (!tenantLandingContent) {
      redirect('/support');
    }

    return <LandingPageContent content={tenantLandingContent} />;
  }

  // Main domain - show landing page
  const content = await getLandingPageContent();

  return <LandingPageContent content={content} showAnimations={true} />;
}
