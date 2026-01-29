/**
 * Pricing Page (CMS-driven, Context-aware)
 *
 * Works on both main domain and tenant subdomains.
 * - Main domain: Shows platform products (create your portal)
 * - Tenant subdomain: Shows tenant's products (memberships, etc.)
 *
 * Uses CSS variables for theming consistency with landing page.
 */

import { PricingPage as GenericPricingPage } from '@/components/checkout';
import { getHeaderData, getServiceTiers } from '@/lib/cms';
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
  const [products, headerData] = await Promise.all([
    getServiceTiers(),
    getHeaderData(),
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
  const hasTicketing = tenant?.jira?.connected ?? false;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <LandingPageHeader
        siteName={siteName}
        isMainDomain={isMainDomain}
        hasContactPage={headerData.hasContactPage}
        hasTicketing={hasTicketing}
      />

      <GenericPricingPage
        title={isMainDomain ? 'Simple, Transparent Pricing' : 'Choose Your Plan'}
        subtitle={isMainDomain ? 'One plan, everything included. No hidden fees.' : 'Select the plan that works best for you'}
        products={products}
        currentProductSlug={currentProductSlug}
        isMainDomain={isMainDomain}
      />

      {/* FAQ Section (main domain only) */}
      {isMainDomain && products.length > 0 && (
        <section className="py-20 px-6 border-t border-[var(--border-primary)]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-[var(--text-primary)]">
              Frequently Asked Questions
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">How does billing work?</h3>
                <p className="text-[var(--text-secondary)]">
                  You&apos;ll be billed monthly. Cancel anytime and your portal remains active until the end of your billing period.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Can I change my subdomain later?</h3>
                <p className="text-[var(--text-secondary)]">
                  Currently, subdomains cannot be changed after creation. Choose carefully!
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">What happens if I cancel?</h3>
                <p className="text-[var(--text-secondary)]">
                  Your portal remains active until the end of your billing period. After that, it becomes inaccessible but data is retained for 30 days.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <LandingPageFooter siteName={siteName} isMainDomain={isMainDomain} />
    </div>
  );
}
