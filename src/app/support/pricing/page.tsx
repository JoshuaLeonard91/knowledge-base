/**
 * Support Pricing Page
 *
 * CMS-driven pricing page that works on both main domain and tenant subdomains.
 * Uses the generic PricingPage component.
 */

import { PricingPage } from '@/components/checkout';
import { getServiceTiers, getHeaderData } from '@/lib/cms';
import { getTenantFromRequest } from '@/lib/tenant';
import { getSession, isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function SupportPricingPage() {
  const tenant = await getTenantFromRequest();
  const isMainDomain = !tenant;

  // Fetch data in parallel
  const [products, headerData, authenticated] = await Promise.all([
    getServiceTiers(),
    getHeaderData(),
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

  const siteName = headerData.settings.siteName || 'Support Portal';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]">
      <PricingPage
        title={`${siteName} Plans`}
        subtitle="Choose the plan that works best for you"
        products={products}
        currentProductSlug={currentProductSlug}
      />
    </div>
  );
}
