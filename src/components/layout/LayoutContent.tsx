'use client';

import { useTheme } from '@/components/theme/ThemeProvider';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MinimalLayout } from '@/components/minimal/MinimalLayout';
import { MinimalApp } from '@/components/minimal/MinimalApp';

interface LayoutContentProps {
  children: React.ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
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
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </>
  );
}
