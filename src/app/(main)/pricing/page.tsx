/**
 * Pricing Page (CMS-driven, Context-aware)
 *
 * Works on both main domain and tenant subdomains.
 * - Main domain: Shows platform products (create your portal)
 * - Tenant subdomain: Shows tenant's products (memberships, etc.)
 *
 * Page content (titles, FAQ) from PricingPageContent model.
 * Pricing tiers from ServiceTier model.
 * Navbar + Footer provided by LayoutContent.
 */

import { PricingPage as GenericPricingPage } from '@/components/checkout';
import { getServiceTiers, getPricingPageContent } from '@/lib/cms';
import { getTenantFromRequest } from '@/lib/tenant';
import { getSession, isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const tenant = await getTenantFromRequest();
  const isMainDomain = !tenant;

  const [products, pageContent] = await Promise.all([
    getServiceTiers(),
    getPricingPageContent(),
  ]);

  // Check for current subscription (shows "Current Plan" badge)
  let currentProductSlug: string | undefined;
  const authenticated = await isAuthenticated();

  if (authenticated) {
    const session = await getSession();
    if (session) {
      if (isMainDomain) {
        const user = await prisma.user.findUnique({
          where: { discordId: session.id },
          include: { subscription: true },
        });
        if (user?.subscription?.status === 'ACTIVE') {
          currentProductSlug = 'pro';
        }
      } else {
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

  return (
    <>
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
    </>
  );
}
