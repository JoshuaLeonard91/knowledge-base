'use client';

/**
 * Tenant Landing Page Header
 *
 * Header for tenant landing pages with site name, navigation links, and CTA.
 * Uses CSS variables for tenant-specific theming.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TenantLandingHeaderProps {
  siteName: string;
  hasContactPage?: boolean;
}

export function TenantLandingHeader({ siteName, hasContactPage = true }: TenantLandingHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[var(--text-primary)]">
          {siteName}
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/support/pricing"
            className={`transition ${
              pathname === '/support/pricing'
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/support"
            className={`transition ${
              pathname === '/support' && !pathname.includes('/support/')
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Support
          </Link>
          {hasContactPage && (
            <Link
              href="/support/contact"
              className={`transition ${
                pathname === '/support/contact'
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Contact
            </Link>
          )}
          <Link
            href="/support"
            className="btn-primary px-5 py-2 rounded-lg font-medium transition"
          >
            Get Help
          </Link>
        </div>
      </nav>
    </header>
  );
}
