'use client';

/**
 * Billing Page
 *
 * Manages subscription billing through Stripe Customer Portal.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlatform } from '../../PlatformProvider';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const { siteName } = usePlatform();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch billing data
  const fetchData = async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    }
    try {
      // Add cache-busting and no-cache headers to ensure fresh data
      const res = await fetch(`/api/stripe/subscription?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const subData = await res.json();

      if (!subData.success) {
        router.push('/signup');
        return;
      }

      if (subData.nextStep !== 'dashboard') {
        router.push('/signup');
        return;
      }

      setData(subData);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [router]);

  // Refresh data when returning from Stripe Portal
  useEffect(() => {
    const fromPortal = searchParams.get('from_portal');
    if (fromPortal === 'true') {
      // Clear the param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('from_portal');
      window.history.replaceState({}, '', url.toString());

      // Refresh data after a short delay to allow webhook to process
      setIsRefreshing(true);
      setTimeout(() => {
        fetchData(true);
      }, 1000);
    }
  }, [searchParams]);

  // Open Stripe Customer Portal
  const openStripePortal = async () => {
    setIsPortalLoading(true);
    setError(null);

    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.csrf;

      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      const portalData = await res.json();

      if (portalData.success && portalData.url) {
        window.location.href = portalData.url;
      } else {
        setError(portalData.error || 'Failed to open billing portal');
      }
    } catch (err) {
      console.error('Portal request failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const statusColors = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-white/10 text-white/60 border-white/20',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-white">
            {siteName}
          </Link>
          <Link href="/dashboard" className="text-white/60 hover:text-white transition">
            &larr; Back to Dashboard
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold mb-2">Billing</h1>
        <p className="text-white/60 mb-8">Manage your subscription and payment methods.</p>

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
            <p className="text-white/60 text-sm mb-4">
              If you cancel, your portal will remain active until the end of your current billing period
              ({data.subscription && new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}).
              After that, your portal will become inaccessible.
            </p>
            <button
              onClick={openStripePortal}
              disabled={isPortalLoading}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition"
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
        <div className="bg-[#16161f] rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Current Plan</h2>
              <p className="text-white/60">Pro - $5/month</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="p-1.5 text-white/40 hover:text-white/80 transition disabled:opacity-50"
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
              <span
                className={`px-3 py-1 text-sm rounded-full border ${
                  statusColors[data.status.color]
                }`}
              >
                {data.status.status}
              </span>
            </div>
          </div>

          <p className="text-white/60 mb-6">{data.status.description}</p>

          {data.subscription && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0a0a0f] rounded-lg p-4">
                <p className="text-sm text-white/40 mb-1">Billing Period Ends</p>
                <p className="font-medium">
                  {new Date(data.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="bg-[#0a0a0f] rounded-lg p-4">
                <p className="text-sm text-white/40 mb-1">Auto-Renewal</p>
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
        </div>

        {/* Stripe Portal Button */}
        <div className="bg-[#16161f] rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold mb-2">Manage in Stripe</h2>
          <p className="text-white/60 mb-6">
            Update your payment method, view invoices, or cancel your subscription through the Stripe
            Customer Portal.
          </p>

          <button
            onClick={openStripePortal}
            disabled={isPortalLoading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-2"
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
        </div>
      </main>
    </div>
  );
}
