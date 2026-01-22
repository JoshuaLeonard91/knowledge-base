'use client';

/**
 * Main Domain Header
 *
 * Shared header for main domain marketing pages (landing, pricing, contact, signup).
 * Provides consistent navigation across all marketing pages.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MainHeaderProps {
  siteName: string;
}

export function MainHeader({ siteName }: MainHeaderProps) {
  const pathname = usePathname();

  // Don't show "Get Started" on signup page since user is already signing up
  const isSignupPage = pathname === '/signup';

  return (
    <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          {siteName}
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className={`transition ${
              pathname === '/pricing'
                ? 'text-white'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/support"
            className={`transition ${
              pathname.startsWith('/support')
                ? 'text-white'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Support
          </Link>
          <Link
            href="/contact"
            className={`transition ${
              pathname === '/contact'
                ? 'text-white'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Contact
          </Link>
          {/* Always render button container to maintain consistent height */}
          <div className="w-[118px] h-[38px]">
            {!isSignupPage && (
              <Link
                href="/signup"
                className="flex items-center justify-center w-full h-full bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition !text-white"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
