import { notFound } from 'next/navigation';
import { getServicesPageData } from '@/lib/cms';
import { ServicesContent } from './ServicesContent';
import { getTenantFromRequest } from '@/lib/tenant';
import { getSession, isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/db/client';

// Force dynamic rendering - fetches fresh data on every request
// Required for multi-tenant setup where content changes without rebuilds
export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  console.log('[ServicesPage] Fetching data...');

  // Fetch all service data from CMS in a single query (reduces API calls from 7 to 1)
  const { services, serviceTiers, slaHighlights, helpfulResources, pageContent, contactSettings, inquiryTypes } = await getServicesPageData();

  console.log('[ServicesPage] Data received:', {
    servicesCount: services.length,
    tiersCount: serviceTiers.length,
    slaCount: slaHighlights.length,
    resourcesCount: helpfulResources.length,
    hasPageContent: !!pageContent,
    hasContactSettings: !!contactSettings,
    inquiryTypesCount: inquiryTypes.length,
  });

  // If no services exist in CMS, return 404
  // This effectively hides the services page when client doesn't want it
  if (services.length === 0) {
    console.log('[ServicesPage] No services found, returning 404');
    notFound();
  }

  // Get current subscription to show "Current Plan" on buttons
  const tenant = await getTenantFromRequest();
  const isMainDomain = !tenant;
  const authenticated = await isAuthenticated();
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
    <ServicesContent
      services={services}
      serviceTiers={serviceTiers}
      slaHighlights={slaHighlights}
      helpfulResources={helpfulResources}
      pageContent={pageContent}
      contactSettings={contactSettings}
      inquiryTypes={inquiryTypes}
      currentProductSlug={currentProductSlug}
    />
  );
}
