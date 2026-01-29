'use client';

/**
 * Shared Landing Page Header
 *
 * Used by both main domain and tenant subdomains.
 * Adapts URLs and features based on context.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface LandingPageHeaderProps {
  siteName: string;
  isMainDomain?: boolean;
  hasContactPage?: boolean;
  hasTicketing?: boolean; // Show ticket button if tenant has Jira configured
}

interface UserStatus {
  isLoggedIn: boolean;
  hasDashboard: boolean;
  userName?: string;
  userAvatar?: string;
}

export function LandingPageHeader({
  siteName,
  isMainDomain = false,
  hasContactPage = true,
  hasTicketing = false,
}: LandingPageHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userStatus, setUserStatus] = useState<UserStatus>({
    isLoggedIn: false,
    hasDashboard: false,
  });
  const [isLoading, setIsLoading] = useState(true); // Check auth for both main and tenant
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // URL paths - pricing and contact stay at root level for consistent landing experience
  const urls = { pricing: '/pricing', support: '/support', contact: '/contact' };

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

  // Handle logout (main domain only)
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUserStatus({ isLoggedIn: false, hasDashboard: false });
      setShowUserMenu(false);
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Check auth status (both main domain and tenants)
  useEffect(() => {
    async function checkAuth() {
      setIsLoading(true);
      try {
        const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated) {
          setUserStatus({ isLoggedIn: false, hasDashboard: false });
          setIsLoading(false);
          return;
        }

        // Only check subscription status for main domain
        let hasDashboard = false;
        if (isMainDomain) {
          const subRes = await fetch('/api/stripe/subscription', { cache: 'no-store' });
          const subData = await subRes.json();
          hasDashboard = subData.success && subData.nextStep === 'dashboard';
        }

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
  }, [pathname, isMainDomain]);

  // Don't show auth buttons on certain pages
  const isSignupPage = pathname === '/signup';
  const isOnboardingPage = pathname === '/onboarding';
  const isDashboardPage = pathname.startsWith('/dashboard');

  const renderActionButton = () => {
    // Main domain: Hide on certain pages
    if (isMainDomain && (isSignupPage || isOnboardingPage || isDashboardPage)) {
      return null;
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="w-[118px] h-[38px] bg-[var(--bg-secondary)] rounded-lg animate-pulse" />
      );
    }

    // Logged in: User menu
    if (userStatus.isLoggedIn) {
      return (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 h-[38px] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg font-medium transition text-[var(--text-primary)]"
          >
            {userStatus.userAvatar ? (
              <img src={userStatus.userAvatar} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-xs text-white">
                {userStatus.userName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="hidden sm:inline text-[var(--text-primary)]">{userStatus.userName || 'User'}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg py-1 z-50">
              {isMainDomain ? (
                <Link
                  href="/dashboard"
                  onClick={() => setShowUserMenu(false)}
                  className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/support"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    Support Hub
                  </Link>
                  {hasTicketing && (
                    <Link
                      href="/support/ticket"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      Submit Ticket
                    </Link>
                  )}
                </>
              )}
              <hr className="my-1 border-[var(--border-primary)]" />
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--bg-tertiary)] hover:text-red-300 disabled:opacity-50"
              >
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          )}
        </div>
      );
    }

    // Not logged in: Login button
    // Main domain -> redirect to dashboard after login
    // Tenant -> redirect back to landing page after login
    const callbackUrl = isMainDomain ? '/dashboard' : '/';
    return (
      <Link
        href={`/api/auth/discord?callbackUrl=${callbackUrl}`}
        className="btn-primary flex items-center justify-center w-[118px] h-[38px] rounded-lg font-medium transition"
      >
        Login
      </Link>
    );
  };

  return (
    <header className="border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[var(--text-primary)]">
          {siteName}
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href={urls.pricing}
            className={`transition ${
              pathname === urls.pricing
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Pricing
          </Link>
          <Link
            href={urls.support}
            className={`transition ${
              pathname.startsWith('/support')
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Support
          </Link>
          {hasContactPage && (
            <Link
              href={urls.contact}
              className={`transition ${
                pathname === urls.contact
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Contact
            </Link>
          )}
          {/* Ticket button for tenants with ticketing enabled */}
          {!isMainDomain && hasTicketing && (
            <Link
              href="/support/ticket"
              className="btn-primary px-4 py-2 rounded-lg font-medium transition text-sm"
            >
              Submit Ticket
            </Link>
          )}
          {/* Action button area (Login/User menu) */}
          <div className="min-w-[118px] h-[38px] flex items-center justify-end">
            {renderActionButton()}
          </div>
        </div>
      </nav>
    </header>
  );
}
