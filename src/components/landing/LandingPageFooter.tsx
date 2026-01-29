/**
 * Shared Landing Page Footer
 *
 * Used by both main domain and tenant subdomains.
 * Uses CSS variables for theming.
 */

import Link from 'next/link';

interface LandingPageFooterProps {
  siteName: string;
  isMainDomain?: boolean;
}

export function LandingPageFooter({ siteName, isMainDomain = false }: LandingPageFooterProps) {
  // URL paths - pricing and contact stay at root level for consistent landing experience
  const urls = { pricing: '/pricing', support: '/support', contact: '/contact' };

  return (
    <footer className="border-t border-[var(--border-primary)] py-8 px-6 bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[var(--text-muted)] text-sm">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href={urls.pricing}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
          >
            Pricing
          </Link>
          <Link
            href={urls.contact}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
          >
            Contact
          </Link>
          <Link
            href={urls.support}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
          >
            Documentation
          </Link>
        </div>
      </div>
    </footer>
  );
}
