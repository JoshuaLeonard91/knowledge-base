/**
 * Dashboard Loading Skeleton
 *
 * Shown by Next.js during route transitions within the dashboard.
 * Matches the general dashboard content area layout.
 */

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Page title */}
      <div className="h-8 w-48 bg-[var(--bg-tertiary)] rounded-lg" />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]" />
        ))}
      </div>

      {/* Main content area */}
      <div className="space-y-4">
        <div className="h-5 w-32 bg-[var(--bg-tertiary)] rounded" />
        <div className="h-48 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-primary)]" />
      </div>
    </div>
  );
}
