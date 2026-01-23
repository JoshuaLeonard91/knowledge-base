'use client';

/**
 * Main Domain Header
 *
 * Shared header for main domain marketing pages (landing, pricing, contact, signup).
 * Shows "Dashboard" for logged-in users, "Get Started" for others.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MainHeaderProps {
  siteName: string;
}

interface UserStatus {
  isLoggedIn: boolean;
  hasDashboard: boolean; // Has active subscription + tenant
  userName?: string;
  userAvatar?: string;
}

export function MainHeader({ siteName }: MainHeaderProps) {
  const pathname = usePathname();
  const [userStatus, setUserStatus] = useState<UserStatus>({
    isLoggedIn: false,
    hasDashboard: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check user authentication status on mount and route changes
  useEffect(() => {
    async function checkAuth() {
      setIsLoading(true);
      try {
        // Check session with cache-busting
        const sessionRes = await fetch('/api/auth/session', {
          cache: 'no-store',
        });
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated) {
          setUserStatus({ isLoggedIn: false, hasDashboard: false });
          setIsLoading(false);
          return;
        }

        // User is logged in, check subscription status
        const subRes = await fetch('/api/stripe/subscription', {
          cache: 'no-store',
        });
        const subData = await subRes.json();

        const hasDashboard = subData.success && subData.nextStep === 'dashboard';

        setUserStatus({
          isLoggedIn: true,
          hasDashboard,
          userName: sessionData.user?.username,
          userAvatar: sessionData.user?.avatar,
        });
      } catch {
        setUserStatus({ isLoggedIn: false, hasDashboard: false });
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [pathname]); // Re-check on every route change

  // Don't show buttons on certain pages
  const isSignupPage = pathname === '/signup';
  const isOnboardingPage = pathname === '/onboarding';
  const isDashboardPage = pathname.startsWith('/dashboard');

  // Determine what to show in the action area
  const renderActionButton = () => {
    // Hide on signup/onboarding/dashboard pages
    if (isSignupPage || isOnboardingPage || isDashboardPage) {
      return null;
    }

    // Loading state - show placeholder
    if (isLoading) {
      return (
        <div className="w-[118px] h-[38px] bg-white/5 rounded-lg animate-pulse" />
      );
    }

    // Logged in with dashboard access
    if (userStatus.hasDashboard) {
      return (
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-4 h-[38px] bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition !text-white"
        >
          {userStatus.userAvatar ? (
            <img
              src={userStatus.userAvatar}
              alt=""
              className="w-5 h-5 rounded-full"
            />
          ) : null}
          Dashboard
        </Link>
      );
    }

    // Logged in but no dashboard (needs to complete signup)
    if (userStatus.isLoggedIn) {
      return (
        <Link
          href="/signup"
          className="flex items-center justify-center px-4 h-[38px] bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition !text-white whitespace-nowrap"
        >
          Continue Setup
        </Link>
      );
    }

    // Not logged in
    return (
      <Link
        href="/signup"
        className="flex items-center justify-center w-[118px] h-[38px] bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition !text-white"
      >
        Get Started
      </Link>
    );
  };

  return (
    <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          {siteName}
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className={`transition ${
              pathname === '/pricing'
                ? 'text-white'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/support"
            className={`transition ${
              pathname.startsWith('/support')
                ? 'text-white'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Support
          </Link>
          <Link
            href="/contact"
            className={`transition ${
              pathname === '/contact'
                ? 'text-white'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Contact
          </Link>
          {/* Action button area */}
          <div className="min-w-[118px] h-[38px] flex items-center justify-end">
            {renderActionButton()}
          </div>
        </div>
      </nav>
    </header>
  );
}
