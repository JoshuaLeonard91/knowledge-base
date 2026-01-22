/**
 * Main Domain Footer
 *
 * Shared footer for main domain marketing pages.
 */

import Link from 'next/link';

interface MainFooterProps {
  siteName: string;
}

export function MainFooter({ siteName }: MainFooterProps) {
  return (
    <footer className="border-t border-white/10 py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-white/40 text-sm">
          &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/pricing" className="text-white/40 hover:text-white/60 transition">
            Pricing
          </Link>
          <Link href="/contact" className="text-white/40 hover:text-white/60 transition">
            Contact
          </Link>
          <Link href="/support" className="text-white/40 hover:text-white/60 transition">
            Documentation
          </Link>
        </div>
      </div>
    </footer>
  );
}
