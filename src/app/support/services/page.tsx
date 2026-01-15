import { notFound } from 'next/navigation';
import { getServices, getServiceTiers, getSLAHighlights, getHelpfulResources } from '@/lib/cms';
import { ServicesContent } from './ServicesContent';

// Force dynamic rendering - fetches fresh data on every request
// Required for multi-tenant setup where content changes without rebuilds
export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  // Fetch all service data from CMS
  const [services, serviceTiers, slaHighlights, helpfulResources] = await Promise.all([
    getServices(),
    getServiceTiers(),
    getSLAHighlights(),
    getHelpfulResources(),
  ]);

  // If no services exist in CMS, return 404
  // This effectively hides the services page when client doesn't want it
  if (services.length === 0) {
    notFound();
  }

  return (
    <ServicesContent
      services={services}
      serviceTiers={serviceTiers}
      slaHighlights={slaHighlights}
      helpfulResources={helpfulResources}
    />
  );
}
