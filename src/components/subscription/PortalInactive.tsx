'use client';

/**
 * Full-page "Portal Inactive" screen shown on tenant subdomains
 * when the owner's subscription has expired.
 *
 * Renders within the tenant's theme so branding still applies.
 */

interface PortalInactiveProps {
  tenantName: string;
}

export function PortalInactive({ tenantName }: PortalInactiveProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Portal Inactive
          </h1>
          <p className="text-[var(--text-secondary)]">
            The <span className="font-semibold text-[var(--text-primary)]">{tenantName}</span> support portal is currently unavailable.
          </p>
        </div>

        {/* Explanation */}
        <div className="bg-[var(--bg-secondary)]/60 border border-white/[0.06] rounded-xl p-5 text-sm text-[var(--text-secondary)] space-y-2">
          <p>
            This portal&apos;s subscription has expired. If you are the portal owner,
            resubscribe to restore access for your users.
          </p>
        </div>

        {/* CTA */}
        <a
          href="https://helpportal.app/dashboard/billing"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium text-sm transition-colors"
        >
          Manage Subscription
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </a>

        <p className="text-xs text-[var(--text-muted)]">
          If you are a user of this portal, please contact the portal owner.
        </p>
      </div>
    </div>
  );
}
