'use client';

/**
 * Tenant Landing Page Header
 *
 * Simple header for tenant landing pages with site name and support link.
 * Uses CSS variables for tenant-specific theming.
 */

import Link from 'next/link';

interface TenantLandingHeaderProps {
  siteName: string;
}

export function TenantLandingHeader({ siteName }: TenantLandingHeaderProps) {
  return (
    <header className="border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[var(--text-primary)]">
          {siteName}
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/support"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            Support
          </Link>
          <Link
            href="/support"
            className="px-5 py-2 bg-[var(--accent-primary)] hover:opacity-90 rounded-lg font-medium transition text-white"
          >
            Get Help
          </Link>
        </div>
      </nav>
    </header>
  );
}
