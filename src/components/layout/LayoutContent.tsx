'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme/ThemeProvider';
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
    hasContactPage: boolean;
    hasLandingPage: boolean;
  };
  footerData: {
    settings: FooterSettings;
    links: FooterLink[];
  };
}

export function LayoutContent({ children, headerData, footerData }: LayoutContentProps) {
  const { uiMode } = useTheme();
  const pathname = usePathname();

  if (uiMode === 'minimal') {
    return (
      <MinimalLayout>
        <MinimalApp />
      </MinimalLayout>
    );
  }

  // Pages that manage their own header/layout (no Navbar/Footer)
  const isSelfManagedPage = pathname === '/signup' || pathname === '/onboarding' || pathname.startsWith('/dashboard');

  if (isSelfManagedPage) {
    return (
      <>
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

  // All other pages get Navbar + Footer (landing pages, support pages, tenant pages)
  return (
    <>
      <Suspense fallback={null}>
        <ProgressBar />
      </Suspense>
      <Navbar settings={headerData.settings} navLinks={headerData.navLinks} hasContactPage={headerData.hasContactPage} hasLandingPage={headerData.hasLandingPage} />
      <main className="flex-1 pt-16">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
      <Footer settings={footerData.settings} links={footerData.links} />
    </>
  );
}
