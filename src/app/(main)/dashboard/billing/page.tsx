'use client';

/**
 * Billing Page
 *
 * Manages subscription billing through Stripe Customer Portal.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/components/dashboard/DashboardContext';
import { FloatingPanel } from '@/components/dashboard/FloatingPanel';

interface BillingData {
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
  } | null;
  status: {
    status: string;
    description: string;
    color: 'green' | 'yellow' | 'red' | 'gray';
  };
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const { isLoading: contextLoading, refresh } = useDashboard();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch billing data
  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/stripe/subscription?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const subData = await res.json();
      if (!subData.success) return;
      setData(subData);
    } catch {
      console.error('Failed to fetch billing data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Refresh data when returning from Stripe Portal
  useEffect(() => {
    const fromPortal = searchParams.get('from_portal');
    if (fromPortal === 'true') {
      const url = new URL(window.location.href);
      url.searchParams.delete('from_portal');
      window.history.replaceState({}, '', url.toString());
      setIsRefreshing(true);
      setTimeout(() => {
        fetchData(true);
        refresh();
      }, 1000);
    }
  }, [searchParams, refresh]);

  // Open Stripe Customer Portal
  const openStripePortal = async () => {
    setIsPortalLoading(true);
    setError(null);

    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();

      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrf,
        },
      });

      const portalData = await res.json();

      if (portalData.success && portalData.url) {
        window.location.href = portalData.url;
      } else {
        setError(portalData.error || 'Failed to open billing portal');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (isLoading || contextLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!data) return null;

  const statusColors = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">Billing</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-6">Manage your subscription and payment methods.</p>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Cancel Warning */}
      {action === 'cancel' && !data.subscription?.cancelAtPeriodEnd && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <h3 className="font-semibold text-yellow-400 mb-2">Cancel Subscription?</h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            If you cancel, your portal will remain active until the end of your current billing period
            ({data.subscription && new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}).
            After that, your portal will become inaccessible.
          </p>
          <button
            onClick={openStripePortal}
            disabled={isPortalLoading}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition text-white"
          >
            {isPortalLoading ? 'Loading...' : 'Proceed to Cancel'}
          </button>
        </div>
      )}

      {/* Refreshing indicator */}
      {isRefreshing && (
        <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" />
          <p className="text-indigo-400 text-sm">Refreshing subscription status...</p>
        </div>
      )}

      {/* Subscription Status */}
      <FloatingPanel className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Current Plan</h2>
            <p className="text-[var(--text-secondary)]">Pro - $5/month</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition disabled:opacity-50"
              title="Refresh status"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <span className={`px-3 py-1 text-sm rounded-full border ${statusColors[data.status.color]}`}>
              {data.status.status}
            </span>
          </div>
        </div>

        <p className="text-[var(--text-secondary)] mb-6">{data.status.description}</p>

        {data.subscription && data.subscription.status !== 'EXPIRED' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[var(--bg-primary)]/50 rounded-lg p-4">
              <p className="text-sm text-[var(--text-muted)] mb-1">Billing Period Ends</p>
              <p className="font-medium text-[var(--text-primary)]">
                {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="bg-[var(--bg-primary)]/50 rounded-lg p-4">
              <p className="text-sm text-[var(--text-muted)] mb-1">Auto-Renewal</p>
              <p className="font-medium">
                {data.subscription.cancelAtPeriodEnd ? (
                  <span className="text-yellow-400">Disabled</span>
                ) : (
                  <span className="text-green-400">Enabled</span>
                )}
              </p>
            </div>
          </div>
        )}

        {data.subscription?.cancelAtPeriodEnd && data.subscription.canceledAt && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-sm">
              Your subscription was canceled on{' '}
              {new Date(data.subscription.canceledAt).toLocaleDateString()}. You will have access
              until {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}.
            </p>
          </div>
        )}
      </FloatingPanel>

      {/* Stripe Portal Button */}
      <FloatingPanel>
        <h2 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Manage in Stripe</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Update your payment method, view invoices, or cancel your subscription through the Stripe
          Customer Portal.
        </p>

        <button
          onClick={openStripePortal}
          disabled={isPortalLoading}
          className="w-full py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition text-white flex items-center justify-center gap-2"
        >
          {isPortalLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
              Opening Portal...
            </>
          ) : (
            <>
              Open Billing Portal
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </>
          )}
        </button>
      </FloatingPanel>
    </div>
  );
}
