'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
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

  if (uiMode === 'minimal') {
    return (
      <MinimalLayout>
        <MinimalApp />
      </MinimalLayout>
    );
  }

  // Classic mode
  return (
    <>
      <Navbar settings={headerData.settings} navLinks={headerData.navLinks} />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer settings={footerData.settings} links={footerData.links} />
    </>
  );
}
