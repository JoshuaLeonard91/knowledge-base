'use client';

/**
 * Dashboard Context
 *
 * Shared state for all dashboard pages: user, tenant, subscription.
 * Fetched once in DashboardShell and provided to all child pages.
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardUser {
  username: string;
  avatar: string | null;
}

interface DashboardTenant {
  slug: string;
  name: string;
  status: string;
}

interface DashboardSubscription {
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | null;
}

interface DashboardContextType {
  user: DashboardUser | null;
  tenant: DashboardTenant | null;
  subscription: DashboardSubscription | null;
  hasActiveAccess: boolean;
  hasTenant: boolean;
  nextStep: 'subscribe' | 'onboarding' | 'dashboard' | 'resubscribe';
  isLoading: boolean;
  refresh: () => void;
}

const DashboardContext = createContext<DashboardContextType>({
  user: null,
  tenant: null,
  subscription: null,
  hasActiveAccess: false,
  hasTenant: false,
  nextStep: 'subscribe',
  isLoading: true,
  refresh: () => {},
});

export function useDashboard() {
  return useContext(DashboardContext);
}

interface Props {
  children: ReactNode;
}

export function DashboardProvider({ children }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [tenant, setTenant] = useState<DashboardTenant | null>(null);
  const [subscription, setSubscription] = useState<DashboardSubscription | null>(null);
  const [nextStep, setNextStep] = useState<DashboardContextType['nextStep']>('subscribe');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Check session
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.status === 401) {
        router.push('/signup');
        return;
      }

      // Fetch subscription + tenant info
      const subRes = await fetch(`/api/stripe/subscription?t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-store' },
      });
      if (!subRes.ok) {
        router.push('/signup');
        return;
      }

      const data = await subRes.json();
      const session = await sessionRes.json();

      setUser({
        username: session.user?.displayName || 'User',
        avatar: session.user?.avatarUrl || null,
      });

      setNextStep(data.nextStep || 'subscribe');

      if (data.subscription) {
        setSubscription({
          status: data.subscription.status,
          currentPeriodEnd: data.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: data.subscription.cancelAtPeriodEnd,
          canceledAt: data.subscription.canceledAt || null,
        });
      }

      if (data.tenant) {
        setTenant({
          slug: data.tenant.slug,
          name: data.tenant.name,
          status: data.tenant.status,
        });
      }
    } catch {
      console.error('[Dashboard] Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasActiveAccess = nextStep === 'dashboard' || nextStep === 'onboarding';
  const hasTenant = !!tenant && nextStep === 'dashboard';

  const value = useMemo(() => ({
    user,
    tenant,
    subscription,
    hasActiveAccess,
    hasTenant,
    nextStep,
    isLoading,
    refresh: fetchData,
  }), [user, tenant, subscription, hasActiveAccess, hasTenant, nextStep, isLoading, fetchData]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
