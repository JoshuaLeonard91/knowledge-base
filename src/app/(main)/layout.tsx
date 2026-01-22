/**
 * Main Domain Layout
 *
 * Layout for the main website (pricing, signup, dashboard, etc.)
 * Separate from tenant subdomain layouts.
 *
 * Note: This is a route group layout that nests inside the root layout.
 * It should NOT define <html> or <body> tags.
 */

import type { Metadata } from 'next';
import { getHeaderData } from '@/lib/cms';
import { PlatformProvider } from './PlatformProvider';

export const metadata: Metadata = {
  title: 'Support Portal Platform',
  description: 'Create your own branded support portal with Discord authentication, knowledge base, and ticket management.',
};

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch site name from CMS for main domain pages
  const headerData = await getHeaderData();
  const siteName = headerData.settings.siteName || 'Support Portal';

  return (
    <PlatformProvider siteName={siteName}>
      {children}
    </PlatformProvider>
  );
}
