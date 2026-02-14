'use client';

/**
 * Banner shown on dashboard pages when subscription is expired.
 * Provides resubscribe CTA without fully blocking the page.
 */

import Link from 'next/link';

export function SubscriptionExpiredBanner() {
  return (
    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
      <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <p className="text-sm text-amber-200 flex-1">
        Your subscription has expired. Resubscribe to manage your portal.
      </p>
      <Link
        href="/dashboard/billing"
        className="text-sm font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap transition-colors"
      >
        Resubscribe
      </Link>
    </div>
  );
}
