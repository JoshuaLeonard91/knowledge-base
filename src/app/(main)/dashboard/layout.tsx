'use client';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardProvider } from '@/components/dashboard/DashboardContext';
import { useTenant } from '@/lib/tenant/context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = useTenant();

  // On tenant subdomains, skip the DashboardShell sidebar — those routes
  // serve end-user pages, not owner management. Still provide the context
  // so dashboard pages can read user/subscription data.
  if (tenant) {
    return (
      <DashboardProvider>
        {children}
      </DashboardProvider>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
