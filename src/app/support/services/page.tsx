import { notFound } from 'next/navigation';
import { getServices, getServiceTiers, getSLAHighlights } from '@/lib/cms';
import { ServicesContent } from './ServicesContent';

export default async function ServicesPage() {
  // Fetch all service data from CMS
  const [services, serviceTiers, slaHighlights] = await Promise.all([
    getServices(),
    getServiceTiers(),
    getSLAHighlights(),
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
    />
  );
}
