'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useTenant } from '@/lib/tenant/context';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ProgressBar } from './ProgressBar';
import { PageTransition } from './PageTransition';
import { MinimalLayout } from '@/components/minimal/MinimalLayout';
import { MinimalApp } from '@/components/minimal/MinimalApp';
import type { FooterSettings, FooterLink, HeaderSettings, NavLink } from '@/lib/cms';

interface LayoutContentProps {
  children: React.ReactNode;
  headerData: {
    settings: HeaderSettings;
    navLinks: NavLink[];
  };
  footerData: {
    settings: FooterSettings;
    links: FooterLink[];
  };
}

export function LayoutContent({ children, headerData, footerData }: LayoutContentProps) {
  const { uiMode } = useTheme();
  const tenant = useTenant();
  const pathname = usePathname();

  if (uiMode === 'minimal') {
    return (
      <MinimalLayout>
        <MinimalApp />
      </MinimalLayout>
    );
  }

  // Check if we're on a support page (uses shared layout even on main domain)
  const isSupportPage = pathname.startsWith('/support');

  // Use shared Navbar/Footer for:
  // 1. Tenant subdomains (always)
  // 2. Main domain /support/* pages (documentation/help center)
  if (tenant || isSupportPage) {
    return (
      <>
        {/* Progress bar for route transitions */}
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>
        <Navbar settings={headerData.settings} navLinks={headerData.navLinks} />
        <main className="flex-1 pt-16">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <Footer settings={footerData.settings} links={footerData.links} />
      </>
    );
  }

  // Main domain marketing pages - they handle their own layout
  return (
    <>
      {/* Progress bar for route transitions */}
      <Suspense fallback={null}>
        <ProgressBar />
      </Suspense>
      <main className="flex-1">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </>
  );
}
