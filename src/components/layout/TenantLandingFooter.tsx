'use client';

/**
 * Tenant Landing Page Footer
 *
 * Simple footer for tenant landing pages.
 * Uses CSS variables for tenant-specific theming.
 */

import Link from 'next/link';

interface TenantLandingFooterProps {
  siteName: string;
}

export function TenantLandingFooter({ siteName }: TenantLandingFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-[var(--text-secondary)]">
            &copy; {currentYear} {siteName}. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/support"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              Support Center
            </Link>
            <Link
              href="/support/contact"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
