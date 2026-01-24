'use client';

/**
 * Unified Dashboard Page (Context-aware)
 *
 * Works on both main domain and tenant subdomains.
 * Shows similar layout with context-appropriate content.
 *
 * Main domain: Tenant management, subscription, portal settings
 * Tenant subdomain: User profile, subscription (if any), features
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainHeader } from '@/components/layout/MainHeader';

interface DashboardData {
  context: 'main' | 'tenant';
  user: {
    id: string;
    username: string;
    avatar: string | null;
    email?: string;
  };
  subscription?: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    productName?: string;
    price?: number;
  };
  tenant?: {
    id: string;
    slug: string;
    name: string;
    status: string;
  };
  status: {
    status: string;
    description: string;
    color: 'green' | 'yellow' | 'red' | 'gray';
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [siteName, setSiteName] = useState('HelpPortal');
  const [isMainDomain, setIsMainDomain] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    async function fetchData() {
      try {
        // Get tenant context
        const tenantRes = await fetch('/api/tenant');
        const tenantData = await tenantRes.json();
        const tenant = tenantData.tenant;
        const onMainDomain = !tenant;
        setIsMainDomain(onMainDomain);
        setSiteName(tenant?.name || 'HelpPortal');

        // Get session
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated) {
          router.push('/signup');
          return;
        }

        if (onMainDomain) {
          // Main domain: Get User + Subscription + Tenant
          const subRes = await fetch('/api/stripe/subscription');
          const subData = await subRes.json();

          if (!subData.success) {
            router.push('/signup');
            return;
          }

          // Redirect based on step
          if (subData.nextStep === 'subscribe' || subData.nextStep === 'resubscribe') {
            router.push('/signup');
            return;
          }

          if (subData.nextStep === 'onboarding') {
            router.push('/onboarding');
            return;
          }

          setData({
            context: 'main',
            user: {
              id: sessionData.user?.id,
              username: sessionData.user?.username || 'User',
              avatar: sessionData.user?.avatar || null,
            },
            subscription: subData.subscription ? {
              status: subData.subscription.status,
              currentPeriodEnd: subData.subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subData.subscription.cancelAtPeriodEnd,
              productName: 'Pro',
              price: 5,
            } : undefined,
            tenant: subData.tenant,
            status: subData.status,
          });
        } else {
          // Tenant subdomain: Get TenantUser + TenantSubscription
          const userRes = await fetch('/api/dashboard/user');
          const userData = await userRes.json();

          setData({
            context: 'tenant',
            user: {
              id: sessionData.user?.id,
              username: sessionData.user?.username || 'User',
              avatar: sessionData.user?.avatar || null,
              email: userData.user?.email,
            },
            subscription: userData.subscription ? {
              status: userData.subscription.status,
              currentPeriodEnd: userData.subscription.currentPeriodEnd,
              cancelAtPeriodEnd: userData.subscription.cancelAtPeriodEnd,
              productName: userData.subscription.productName,
              price: userData.subscription.price,
            } : undefined,
            status: {
              status: userData.subscription?.status || 'Free',
              description: userData.subscription ? 'Active membership' : 'No subscription',
              color: userData.subscription?.status === 'ACTIVE' ? 'green' : 'gray',
            },
          });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        router.push('/signup');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [router]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const statusColors = {
    green: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    yellow: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    gray: { bg: 'bg-white/5', text: 'text-white/60', dot: 'bg-white/40' },
  };

  const status = statusColors[data.status.color];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-white">
              {siteName}
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-3 py-2 text-sm font-medium text-white bg-white/5 rounded-lg"
              >
                Dashboard
              </Link>
              {isMainDomain && data.tenant && (
                <a
                  href={`https://${data.tenant.slug}.helpportal.app`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition flex items-center gap-1"
                >
                  Visit Portal
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {!isMainDomain && (
                <Link
                  href="/support"
                  className="px-3 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition"
                >
                  Support
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {data.user.avatar ? (
                <img
                  src={data.user.avatar}
                  alt={data.user.username}
                  className="w-8 h-8 rounded-full ring-2 ring-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium">
                  {data.user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-white hidden sm:block">{data.user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back, {data.user.username}
          </h1>
          <p className="text-white/50">
            {isMainDomain ? 'Manage your support portal and subscription' : 'Manage your account'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Status Card */}
          <div className="bg-[#111118] rounded-xl border border-white/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/50">
                {isMainDomain ? 'Portal Status' : 'Account Status'}
              </span>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${status.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                <span className={`text-xs font-medium ${status.text}`}>
                  {isMainDomain ? (data.tenant?.status || 'No Portal') : data.status.status}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {isMainDomain ? (data.tenant?.name || 'Not Set Up') : data.user.username}
            </p>
          </div>

          {/* Subscription Card */}
          <div className="bg-[#111118] rounded-xl border border-white/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/50">Subscription</span>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${status.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                <span className={`text-xs font-medium ${status.text}`}>
                  {data.subscription?.status || 'None'}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.subscription ? (
                <>
                  ${data.subscription.price}
                  <span className="text-sm font-normal text-white/50">/month</span>
                </>
              ) : (
                'Free'
              )}
            </p>
          </div>

          {/* Next Billing / Renewal Card */}
          <div className="bg-[#111118] rounded-xl border border-white/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white/50">
                {data.subscription?.cancelAtPeriodEnd ? 'Access Until' : 'Next Billing'}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.subscription?.currentPeriodEnd
                ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </p>
            {data.subscription?.cancelAtPeriodEnd && (
              <p className="text-xs text-amber-400 mt-1">Cancellation pending</p>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portal Card (Main domain only) */}
            {isMainDomain && data.tenant && (
              <div className="bg-[#111118] rounded-xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white mb-1">Your Portal</h2>
                  <p className="text-sm text-white/50">Access and manage your support portal</p>
                </div>

                <div className="p-6">
                  {/* Portal URL */}
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-lg mb-6">
                    <div>
                      <p className="text-xs text-white/40 mb-1">PORTAL URL</p>
                      <p className="text-base font-mono text-indigo-400">
                        {data.tenant.slug}.helpportal.app
                      </p>
                    </div>
                    <a
                      href={`https://${data.tenant.slug}.helpportal.app`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition !text-white flex items-center gap-2"
                    >
                      Open Portal
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/dashboard/settings"
                      className="group p-4 bg-[#0a0a0f] hover:bg-white/5 rounded-lg transition"
                    >
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="font-medium text-white mb-0.5">Portal Settings</h3>
                      <p className="text-xs text-white/40">Branding & features</p>
                    </Link>

                    <Link
                      href="/dashboard/integrations"
                      className="group p-4 bg-[#0a0a0f] hover:bg-white/5 rounded-lg transition"
                    >
                      <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition">
                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                        </svg>
                      </div>
                      <h3 className="font-medium text-white mb-0.5">Integrations</h3>
                      <p className="text-xs text-white/40">Jira, Hygraph & more</p>
                    </Link>

                    <Link
                      href="/dashboard/content"
                      className="group p-4 bg-[#0a0a0f] hover:bg-white/5 rounded-lg transition"
                    >
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 transition">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="font-medium text-white mb-0.5">Content</h3>
                      <p className="text-xs text-white/40">Articles & categories</p>
                    </Link>

                    <Link
                      href="/dashboard/payments"
                      className="group p-4 bg-[#0a0a0f] hover:bg-white/5 rounded-lg transition"
                    >
                      <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h3 className="font-medium text-white mb-0.5">Payments</h3>
                      <p className="text-xs text-white/40">Stripe Connect</p>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* User Features (Tenant subdomain only) */}
            {!isMainDomain && (
              <div className="bg-[#111118] rounded-xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white mb-1">Quick Access</h2>
                  <p className="text-sm text-white/50">Jump to your most used features</p>
                </div>

                <div className="p-6 grid grid-cols-2 gap-3">
                  <Link
                    href="/support"
                    className="group p-4 bg-[#0a0a0f] hover:bg-white/5 rounded-lg transition"
                  >
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition">
                      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-white mb-0.5">Help Center</h3>
                    <p className="text-xs text-white/40">Browse articles & guides</p>
                  </Link>

                  <Link
                    href="/support/ticket"
                    className="group p-4 bg-[#0a0a0f] hover:bg-white/5 rounded-lg transition"
                  >
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 transition">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-white mb-0.5">Submit Ticket</h3>
                    <p className="text-xs text-white/40">Get help from support</p>
                  </Link>

                  <Link
                    href="/support/contact"
                    className="group p-4 bg-[#0a0a0f] hover:bg-white/5 rounded-lg transition"
                  >
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition">
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-white mb-0.5">Contact Us</h3>
                    <p className="text-xs text-white/40">Get in touch</p>
                  </Link>

                  <Link
                    href="/dashboard/profile"
                    className="group p-4 bg-[#0a0a0f] hover:bg-white/5 rounded-lg transition"
                  >
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-white mb-0.5">Profile</h3>
                    <p className="text-xs text-white/40">Manage your account</p>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Subscription Card */}
            {data.subscription && (
              <div className="bg-[#111118] rounded-xl border border-white/5 overflow-hidden">
                <div className="p-5 border-b border-white/5">
                  <h2 className="text-base font-semibold text-white">Subscription</h2>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">Plan</span>
                    <span className="text-sm font-medium text-white">{data.subscription.productName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">Status</span>
                    <span className={`text-sm font-medium ${status.text}`}>
                      {data.subscription.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">
                      {data.subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Link
                      href="/dashboard/billing"
                      className="block w-full py-2.5 text-center bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition text-white"
                    >
                      Manage Billing
                    </Link>
                    {data.subscription.cancelAtPeriodEnd ? (
                      <p className="text-center text-xs text-amber-400 py-2">
                        Cancellation Pending
                      </p>
                    ) : (
                      <Link
                        href="/dashboard/billing?action=cancel"
                        className="block w-full py-2.5 text-center hover:bg-red-500/10 rounded-lg text-sm font-medium transition text-red-400"
                      >
                        Cancel Subscription
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Upgrade Card (for free users on tenant) */}
            {!isMainDomain && !data.subscription && (
              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/20 p-5">
                <h3 className="font-semibold text-white mb-2">Upgrade Your Account</h3>
                <p className="text-sm text-white/60 mb-4">
                  Get access to premium features and priority support.
                </p>
                <Link
                  href="/pricing"
                  className="block w-full py-2.5 text-center bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition text-white"
                >
                  View Plans
                </Link>
              </div>
            )}

            {/* Help Card */}
            <div className="bg-[#111118] rounded-xl border border-white/5 p-5">
              <h3 className="font-medium text-white mb-2">Need Help?</h3>
              <p className="text-sm text-white/50 mb-4">
                Check our documentation or contact support.
              </p>
              <div className="space-y-2">
                <Link
                  href="/support"
                  className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Documentation
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
