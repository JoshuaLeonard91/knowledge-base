/**
 * Pricing Page (CMS-driven, Context-aware)
 *
 * Works on both main domain and tenant subdomains.
 * - Main domain: Shows platform products (create your portal)
 * - Tenant subdomain: Shows tenant's products (memberships, etc.)
 */

import Link from 'next/link';
import { PricingPage as GenericPricingPage } from '@/components/checkout';
import { getHeaderData, getServiceTiers } from '@/lib/cms';
import { getTenantFromRequest } from '@/lib/tenant';
import { getSession, isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { MainHeader } from '@/components/layout/MainHeader';
import { MainFooter } from '@/components/layout/MainFooter';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  // Determine context
  const tenant = await getTenantFromRequest();
  const context = tenant?.slug || 'main';
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <MainHeader siteName={siteName} />

      <GenericPricingPage
        title={isMainDomain ? 'Simple, Transparent Pricing' : 'Choose Your Plan'}
        subtitle={isMainDomain ? 'One plan, everything included. No hidden fees.' : 'Select the plan that works best for you'}
        products={products}
        currentProductSlug={currentProductSlug}
        isMainDomain={isMainDomain}
      />

      {/* FAQ Section (main domain only) */}
      {isMainDomain && products.length > 0 && (
        <section className="py-20 px-6 border-t border-white/10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-2">How does billing work?</h3>
                <p className="text-white/60">
                  You&apos;ll be billed monthly. Cancel anytime and your portal remains active until the end of your billing period.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Can I change my subdomain later?</h3>
                <p className="text-white/60">
                  Currently, subdomains cannot be changed after creation. Choose carefully!
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">What happens if I cancel?</h3>
                <p className="text-white/60">
                  Your portal remains active until the end of your billing period. After that, it becomes inaccessible but data is retained for 30 days.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <MainFooter siteName={siteName} />
    </div>
  );
}
