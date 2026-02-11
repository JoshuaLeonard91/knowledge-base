/**
 * Pricing Page (CMS-driven, Context-aware)
 *
 * Works on both main domain and tenant subdomains.
 * - Main domain: Shows platform products (create your portal)
 * - Tenant subdomain: Shows tenant's products (memberships, etc.)
 *
 * Page content (titles, FAQ) from PricingPageContent model.
 * Pricing tiers from ServiceTier model.
 */

import { PricingPage as GenericPricingPage } from '@/components/checkout';
import { getHeaderData, getServiceTiers, getPricingPageContent } from '@/lib/cms';
import { getTenantFromRequest } from '@/lib/tenant';
import { getSession, isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { LandingPageHeader, LandingPageFooter } from '@/components/landing';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  // Determine context
  const tenant = await getTenantFromRequest();
  const isMainDomain = !tenant;

  // Fetch data in parallel
  const [products, headerData, pageContent] = await Promise.all([
    getServiceTiers(),
    getHeaderData(),
    getPricingPageContent(),
  ]);

  // Check for current subscription (shows "Current Plan" badge)
  let currentProductSlug: string | undefined;
  const authenticated = await isAuthenticated();

  if (authenticated) {
    const session = await getSession();
    if (session) {
      if (isMainDomain) {
        // Check User subscription (platform level)
        const user = await prisma.user.findUnique({
          where: { discordId: session.id },
          include: { subscription: true },
        });
        if (user?.subscription?.status === 'ACTIVE') {
          currentProductSlug = 'pro'; // Default product
        }
      } else {
        // Check TenantUser subscription
        const tenantUser = await prisma.tenantUser.findUnique({
          where: {
            tenantId_discordId: {
              tenantId: tenant.id,
              discordId: session.id,
            },
          },
          include: { subscription: true },
        });
        if (tenantUser?.subscription) {
          currentProductSlug = tenantUser.subscription.productSlug;
        }
      }
    }
  }

  const siteName = headerData.settings.siteName || 'HelpPortal';
  // Tenant uses jira.connected, main domain uses JIRA_PROJECT_KEY env var
  const hasTicketing = tenant ? (tenant.jira?.connected ?? false) : !!process.env.JIRA_PROJECT_KEY;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <LandingPageHeader
        siteName={siteName}
        isMainDomain={isMainDomain}
        hasContactPage={headerData.hasContactPage}
        hasPricingPage={headerData.hasPricingPage}
        hasTicketing={hasTicketing}
      />

      <GenericPricingPage
        title={isMainDomain ? pageContent.pageTitle : 'Choose Your Plan'}
        subtitle={isMainDomain ? pageContent.pageSubtitle : 'Select the plan that works best for you'}
        products={products}
        currentProductSlug={currentProductSlug}
        isMainDomain={isMainDomain}
      />

      {/* FAQ Section (main domain only) */}
      {isMainDomain && pageContent.faqs.length > 0 && (
        <section className="py-20 px-6 border-t border-[var(--border-primary)]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-[var(--text-primary)]">
              {pageContent.faqTitle}
            </h2>

            <div className="space-y-8">
              {pageContent.faqs.map((faq, index) => (
                <div key={index}>
                  <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">{faq.question}</h3>
                  <p className="text-[var(--text-secondary)]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer Note */}
      {isMainDomain && pageContent.footerNote && (
        <div className="text-center pb-8 px-6">
          <p className="text-sm text-[var(--text-muted)]">{pageContent.footerNote}</p>
        </div>
      )}

      <LandingPageFooter siteName={siteName} copyrightText={headerData.settings.copyrightText} isMainDomain={isMainDomain} />
    </div>
  );
}
