import { notFound } from 'next/navigation';
import { getServicesPageData } from '@/lib/cms';
import { ServicesContent } from './ServicesContent';

export default async function ServicesPage() {
  console.log('[ServicesPage] Fetching data...');

  // Fetch all service data from CMS in a single query (reduces API calls from 7 to 1)
  const { services, serviceTiers, slaHighlights, testimonials, helpfulResources, pageContent } = await getServicesPageData();

  console.log('[ServicesPage] Data received:', {
    servicesCount: services.length,
    tiersCount: serviceTiers.length,
    slaCount: slaHighlights.length,
    testimonialsCount: testimonials.length,
    resourcesCount: helpfulResources.length,
    hasPageContent: !!pageContent,
  });

  // If no services exist in CMS, return 404
  // This effectively hides the services page when client doesn't want it
  if (services.length === 0) {
    console.log('[ServicesPage] No services found, returning 404');
    notFound();
  }

  return (
    <ServicesContent
      services={services}
      serviceTiers={serviceTiers}
      slaHighlights={slaHighlights}
      testimonials={testimonials}
      helpfulResources={helpfulResources}
      pageContent={pageContent}
    />
  );
}
