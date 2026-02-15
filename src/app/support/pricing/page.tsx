/**
 * Support Pricing Page
 *
 * CMS-driven pricing page that works on both main domain and tenant subdomains.
 * Uses the generic PricingPage component.
 */

import { PricingPage } from '@/components/checkout';
import { getServiceTiers, getPricingPageContent } from '@/lib/cms';
import { getTenantFromRequest } from '@/lib/tenant';
import { getSession, isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function SupportPricingPage() {
  const tenant = await getTenantFromRequest();
  const isMainDomain = !tenant;

  // Fetch data in parallel
  const [products, pageContent, authenticated] = await Promise.all([
    getServiceTiers(),
    getPricingPageContent(),
    isAuthenticated(),
  ]);

  // Get current subscription if authenticated
  let currentProductSlug: string | undefined;

  if (authenticated) {
    const session = await getSession();
    if (session) {
      if (isMainDomain) {
        // Main domain: Check User subscription (platform level)
        const user = await prisma.user.findUnique({
          where: { discordId: session.id },
          include: { subscription: true },
        });
        if (user?.subscription?.status === 'ACTIVE') {
          currentProductSlug = 'pro'; // Main domain uses 'pro' product
        }
      } else {
        // Tenant subdomain: Check TenantUser subscription
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
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]">
      <PricingPage
        title={pageContent.pageTitle || 'Choose Your Plan'}
        subtitle={isMainDomain ? pageContent.pageSubtitle : 'Choose the plan that works best for you'}
        products={products}
        currentProductSlug={currentProductSlug}
        isMainDomain={isMainDomain}
      />

      {/* FAQ Section */}
      {pageContent.faqs.length > 0 && (
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
      {pageContent.footerNote && (
        <div className="text-center pb-8 px-6">
          <p className="text-sm text-[var(--text-muted)]">{pageContent.footerNote}</p>
        </div>
      )}
    </div>
  );
}
