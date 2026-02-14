'use client';

/**
 * Dashboard Overview Page
 *
 * Main domain states:
 * - No subscription: Shows "Choose a Plan" UI
 * - Has subscription, no tenant: Shows "Complete Setup" UI
 * - Full access: Shows portal management dashboard
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDashboard } from '@/components/dashboard/DashboardContext';
import { FloatingPanel } from '@/components/dashboard/FloatingPanel';
import { SubscriptionExpiredBanner } from '@/components/subscription/SubscriptionExpiredBanner';
import type { ServiceTier } from '@/lib/cms';

export default function DashboardPage() {
  const {
    user,
    tenant,
    subscription,
    hasActiveAccess,
    hasTenant,
    nextStep,
    isLoading,
  } = useDashboard();

  const [products, setProducts] = useState<ServiceTier[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Integration status at-a-glance
  const [integrationStatus, setIntegrationStatus] = useState<{
    hygraph: boolean;
    jira: boolean;
    discord: boolean;
    discordOnline: boolean;
  } | null>(null);

  // Fetch products if no subscription
  useEffect(() => {
    if (!isLoading && nextStep === 'subscribe') {
      fetch('/api/checkout/products')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.products) setProducts(data.products);
        })
        .catch(() => {});
    }
  }, [isLoading, nextStep]);

  // Fetch integration statuses for the overview
  useEffect(() => {
    if (!isLoading && hasTenant) {
      Promise.all([
        fetch('/api/dashboard/integrations/hygraph').then((r) => r.json()).catch(() => null),
        fetch('/api/dashboard/integrations/jira').then((r) => r.json()).catch(() => null),
        fetch('/api/dashboard/integrations/discord-bot').then((r) => r.json()).catch(() => null),
      ]).then(([hygraph, jira, discord]) => {
        setIntegrationStatus({
          hygraph: hygraph?.configured || false,
          jira: jira?.configured || false,
          discord: discord?.configured || false,
          discordOnline: discord?.connected || false,
        });
      });
    }
  }, [isLoading, hasTenant]);

  // Handle checkout
  const handleCheckout = async (productSlug: string) => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();

      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrf,
        },
        body: JSON.stringify({ productSlug, context: 'main' }),
      });

      const result = await res.json();

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setPaymentError(result.error || 'Failed to start checkout');
      }
    } catch {
      setPaymentError('Something went wrong. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const copyPortalUrl = () => {
    if (!tenant) return;
    navigator.clipboard.writeText(`https://${tenant.slug}.helpportal.app`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!user) return null;

  // STATE 1: No subscription — Choose a Plan
  if (nextStep === 'subscribe') {
    return (
      <div>
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            Welcome, {user.username}!
          </h1>
          <p className="text-[var(--text-secondary)]">
            Choose a plan to create your support portal
          </p>
        </div>

        {paymentError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-red-400">{paymentError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {products.map((product) => (
            <FloatingPanel key={product.slug}>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{product.name}</h3>
              <p className="text-[var(--text-secondary)] text-sm mb-4">{product.description}</p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-[var(--text-primary)]">
                  {product.price || 'Free'}
                </span>
              </div>

              {product.features && product.features.length > 0 && (
                <ul className="space-y-2 mb-6">
                  {product.features.slice(0, 4).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => handleCheckout(product.slug)}
                disabled={isProcessingPayment}
                className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition text-white flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                    Processing...
                  </>
                ) : (
                  'Get Started'
                )}
              </button>
            </FloatingPanel>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/pricing"
            className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition flex items-center justify-center gap-2 text-sm"
          >
            View all plans and compare features
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  // STATE 2: Has subscription but no tenant — Complete Setup
  if (nextStep === 'onboarding') {
    return (
      <div>
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            You&apos;re Subscribed!
          </h1>
          <p className="text-[var(--text-secondary)]">
            Now let&apos;s create your support portal
          </p>
        </div>

        {subscription && (
          <FloatingPanel className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--accent-primary)]/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{subscription.productName} Plan</p>
                  <p className="text-sm text-[var(--text-secondary)]">${subscription.price}/month</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-green-400">Active</span>
              </div>
            </div>
          </FloatingPanel>
        )}

        <FloatingPanel className="text-center !p-8 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
            Create Your Portal
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Choose a subdomain and customize your support portal
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl font-semibold transition text-white"
          >
            Continue Setup
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </FloatingPanel>
      </div>
    );
  }

  // STATE 3: Resubscribe — expired
  if (nextStep === 'resubscribe') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">
          Welcome back, {user.username}
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">Your subscription has expired.</p>

        <SubscriptionExpiredBanner />

        {/* Show read-only subscription info */}
        {subscription && (
          <FloatingPanel className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Subscription</h2>
                <p className="text-sm text-[var(--text-secondary)]">{subscription.productName} Plan</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm text-red-400">Expired</span>
              </div>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition"
            >
              Resubscribe
            </Link>
          </FloatingPanel>
        )}

        {tenant && (
          <FloatingPanel>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Your Portal</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Your portal at <span className="font-mono text-[var(--text-primary)]">{tenant.slug}.helpportal.app</span> is currently inactive. Resubscribe to restore access.
            </p>
          </FloatingPanel>
        )}
      </div>
    );
  }

  // STATE 4: Full dashboard
  const portalUrl = tenant ? `https://${tenant.slug}.helpportal.app` : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">
        Welcome back, {user.username}
      </h1>
      <p className="text-[var(--text-secondary)] text-sm mb-6">Manage your support portal and subscription.</p>

      {/* Subscription Card */}
      <FloatingPanel className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {subscription?.productName || 'Pro'} Plan
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              ${subscription?.price || 5}/month
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm text-green-400">Active</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          {subscription?.cancelAtPeriodEnd ? (
            <span className="text-amber-400">
              Cancellation pending &middot; Access until{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ) : subscription?.currentPeriodEnd ? (
            <span>
              Renews{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ) : null}
          <Link
            href="/dashboard/billing"
            className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition font-medium ml-auto"
          >
            Manage Billing
          </Link>
        </div>
      </FloatingPanel>

      {/* Portal URL */}
      {tenant && portalUrl && (
        <FloatingPanel className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Portal URL</h2>
              <p className="text-base font-mono text-[var(--accent-primary)]">
                {tenant.slug}.helpportal.app
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyPortalUrl}
                className="px-3 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] rounded-lg text-sm transition text-[var(--text-secondary)]"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-lg text-sm font-medium transition text-white flex items-center gap-1.5"
              >
                Open
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        </FloatingPanel>
      )}

      {/* Integration Status */}
      <FloatingPanel>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Integrations</h2>
          <Link
            href="/dashboard/integrations"
            className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition font-medium flex items-center gap-1"
          >
            Manage
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        {integrationStatus ? (
          <div className="space-y-3">
            <IntegrationRow
              name="Hygraph CMS"
              connected={integrationStatus.hygraph}
              label={integrationStatus.hygraph ? 'Connected' : 'Not Connected'}
            />
            <IntegrationRow
              name="Jira Service Desk"
              connected={integrationStatus.jira}
              label={integrationStatus.jira ? 'Connected' : 'Not Connected'}
            />
            <IntegrationRow
              name="Discord Bot"
              connected={integrationStatus.discord}
              label={
                integrationStatus.discord
                  ? integrationStatus.discordOnline
                    ? 'Online'
                    : 'Offline'
                  : 'Not Connected'
              }
              online={integrationStatus.discord ? integrationStatus.discordOnline : undefined}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
            ))}
          </div>
        )}
      </FloatingPanel>
    </div>
  );
}

function IntegrationRow({
  name,
  connected,
  label,
  online,
}: {
  name: string;
  connected: boolean;
  label: string;
  online?: boolean;
}) {
  const dotColor = connected
    ? online === false
      ? 'bg-orange-400'
      : 'bg-green-400'
    : 'bg-[var(--text-muted)]';

  const textColor = connected
    ? online === false
      ? 'text-orange-400'
      : 'text-green-400'
    : 'text-[var(--text-muted)]';

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-primary)]/30">
      <span className="text-sm text-[var(--text-primary)]">{name}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className={`text-sm ${textColor}`}>{label}</span>
      </div>
    </div>
  );
}
