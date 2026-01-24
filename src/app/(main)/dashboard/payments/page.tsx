'use client';

/**
 * Payments Page - Stripe Connect Setup
 *
 * Allows tenant owners to connect their Stripe account to receive payments
 * from their customers on their support portal.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePlatform } from '../../PlatformProvider';

interface StripeStatus {
  connected: boolean;
  hasTenant: boolean;
  tenantId?: string;
  tenantSlug?: string;
  stripeAccountId?: string;
  status?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

export default function PaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { siteName } = usePlatform();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check for callback status in URL
  useEffect(() => {
    const connected = searchParams.get('connected');
    const alreadyConnected = searchParams.get('already_connected');
    const errorParam = searchParams.get('error');

    if (connected === 'true') {
      setSuccess('Your Stripe account has been connected successfully!');
    } else if (alreadyConnected === 'true') {
      setSuccess('Your Stripe account is already connected.');
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_params: 'OAuth callback was missing required parameters.',
        invalid_state: 'Invalid OAuth state. Please try again.',
        tenant_not_found: 'Tenant not found.',
        unauthorized: 'You are not authorized to connect this tenant.',
        account_not_found: 'Stripe account not found.',
        connection_failed: 'Failed to connect your Stripe account. Please try again.',
        session_mismatch: 'Session expired. Please try again.',
      };
      // SECURITY: Only show known error messages, use generic for unknown
      setError(errorMessages[errorParam] || 'An error occurred. Please try again.');
    }

    // Clean URL
    if (connected || alreadyConnected || errorParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete('connected');
      url.searchParams.delete('already_connected');
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Fetch status
  const fetchStatus = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/stripe/connect/status${refresh ? '?refresh=true' : ''}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/signup');
          return;
        }
        setError(data.error || 'Failed to load status');
        return;
      }

      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setError('Failed to load status');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
  }, [router]);

  // Handle connect button
  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/stripe/connect/authorize');
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start Stripe Connect');
        setIsConnecting(false);
      }
    } catch (err) {
      console.error('Connect failed:', err);
      setError('Something went wrong. Please try again.');
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!status?.hasTenant) {
      return { color: 'gray', text: 'No Portal' };
    }
    if (!status?.connected) {
      return { color: 'yellow', text: 'Not Connected' };
    }
    if (status?.chargesEnabled && status?.payoutsEnabled) {
      return { color: 'green', text: 'Active' };
    }
    if (status?.chargesEnabled) {
      return { color: 'yellow', text: 'Pending Payouts' };
    }
    return { color: 'yellow', text: 'Setup Incomplete' };
  };

  const badge = getStatusBadge();
  const badgeColors = {
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
        <h1 className="text-3xl font-bold mb-2">Payments</h1>
        <p className="text-white/60 mb-8">Connect your Stripe account to receive payments from your customers.</p>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* No Tenant Warning */}
        {!status?.hasTenant && (
          <div className="bg-[#16161f] rounded-2xl border border-white/10 p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No Portal Created</h3>
              <p className="text-white/60 mb-4">
                You need to create a support portal before you can set up payments.
              </p>
              <Link
                href="/onboarding"
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition"
              >
                Create Portal
              </Link>
            </div>
          </div>
        )}

        {/* Status Card */}
        {status?.hasTenant && (
          <div className="bg-[#16161f] rounded-2xl border border-white/10 p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Stripe Connect</h2>
                <p className="text-white/60 text-sm">
                  {status.tenantSlug}.helpportal.app
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchStatus(true)}
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
                <span className={`px-3 py-1 text-sm rounded-full border ${badgeColors[badge.color as keyof typeof badgeColors]}`}>
                  {badge.text}
                </span>
              </div>
            </div>

            {/* Not Connected State */}
            {!status.connected && (
              <div className="text-center py-8 bg-[#0a0a0f] rounded-lg">
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Connect Your Stripe Account</h3>
                <p className="text-white/60 mb-6 max-w-md mx-auto">
                  Connect your Stripe account to start accepting payments from your customers.
                  You'll be redirected to Stripe to complete the setup.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-8 py-4 bg-[#635BFF] hover:bg-[#5851db] disabled:bg-[#635BFF]/50 disabled:cursor-not-allowed rounded-xl font-semibold transition flex items-center justify-center gap-3 mx-auto"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                      </svg>
                      Connect with Stripe
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Connected State */}
            {status.connected && (
              <div>
                {/* Status Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#0a0a0f] rounded-lg p-4">
                    <p className="text-sm text-white/40 mb-1">Account ID</p>
                    <p className="font-mono text-sm">{status.stripeAccountId}</p>
                  </div>
                  <div className="bg-[#0a0a0f] rounded-lg p-4">
                    <p className="text-sm text-white/40 mb-1">Status</p>
                    <p className="font-medium">{status.status}</p>
                  </div>
                </div>

                {/* Capability Indicators */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        status.chargesEnabled ? 'bg-green-500/20' : 'bg-yellow-500/20'
                      }`}>
                        {status.chargesEnabled ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Accept Payments</p>
                        <p className="text-sm text-white/40">Receive payments from customers</p>
                      </div>
                    </div>
                    <span className={status.chargesEnabled ? 'text-green-400' : 'text-yellow-400'}>
                      {status.chargesEnabled ? 'Enabled' : 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        status.payoutsEnabled ? 'bg-green-500/20' : 'bg-yellow-500/20'
                      }`}>
                        {status.payoutsEnabled ? (
                          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Receive Payouts</p>
                        <p className="text-sm text-white/40">Transfer funds to your bank</p>
                      </div>
                    </div>
                    <span className={status.payoutsEnabled ? 'text-green-400' : 'text-yellow-400'}>
                      {status.payoutsEnabled ? 'Enabled' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Incomplete Setup Warning */}
                {(!status.chargesEnabled || !status.payoutsEnabled) && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-6">
                    <p className="text-yellow-400 text-sm">
                      Your Stripe account setup is incomplete. Please complete the verification process on Stripe to enable all features.
                    </p>
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="mt-3 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition"
                    >
                      Complete Setup on Stripe
                    </button>
                  </div>
                )}

                {/* Success Message for Fully Connected */}
                {status.chargesEnabled && status.payoutsEnabled && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 text-sm flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Your Stripe account is fully set up and ready to accept payments!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        {status?.hasTenant && (
          <div className="bg-[#16161f] rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold mb-4">How it works</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-400 font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Connect Your Stripe Account</h3>
                  <p className="text-sm text-white/60">
                    Click the button above to connect your existing Stripe account or create a new one.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-400 font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Set Up Your Products</h3>
                  <p className="text-sm text-white/60">
                    Configure your pricing tiers and products in your CMS (Hygraph).
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-400 font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Start Accepting Payments</h3>
                  <p className="text-sm text-white/60">
                    Your customers can now subscribe to your products directly on your portal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
