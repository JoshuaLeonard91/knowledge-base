'use client';

/**
 * Main Domain Header
 *
 * Shared header for main domain marketing pages (landing, pricing, contact, signup).
 * Shows "Dashboard" for logged-in users, "Get Started" for others.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

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
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<UserStatus>({
    isLoggedIn: false,
    hasDashboard: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfData.csrf },
      });
      setUserStatus({ isLoggedIn: false, hasDashboard: false });
      setShowUserMenu(false);
      router.refresh();
    } catch {
      console.error('Logout failed');
    } finally {
      setIsLoggingOut(false);
    }
  };

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
          userName: sessionData.user?.displayName,
          userAvatar: sessionData.user?.avatarUrl,
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

    // Logged in - show user menu
    if (userStatus.isLoggedIn) {
      return (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 h-[38px] bg-white/5 hover:bg-white/10 rounded-lg font-medium transition text-white"
          >
            {userStatus.userAvatar ? (
              <img
                src={userStatus.userAvatar}
                alt=""
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs">
                {userStatus.userName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="hidden sm:inline">{userStatus.userName || 'User'}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-lg py-1 z-50">
              <Link
                href="/dashboard"
                onClick={() => setShowUserMenu(false)}
                className="block px-4 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white"
              >
                Dashboard
              </Link>
              <hr className="my-1 border-white/10" />
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 disabled:opacity-50"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          )}
        </div>
      );
    }

    // Not logged in - go directly to Discord OAuth
    return (
      <Link
        href="/api/auth/discord?callbackUrl=/dashboard"
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
