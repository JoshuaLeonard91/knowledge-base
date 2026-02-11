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
import { SquaresFour, Compass, Ticket, ListChecks, SignOut, List, X } from '@phosphor-icons/react';

interface LandingPageHeaderProps {
  siteName: string;
  isMainDomain?: boolean;
  hasContactPage?: boolean;
  hasPricingPage?: boolean; // Show pricing link if products configured in CMS
  hasTicketing?: boolean; // Show ticket button if Jira configured (tenant or main domain)
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
  hasPricingPage = false,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
            <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg shadow-lg p-1.5 z-50">
              {isMainDomain && (
                <a
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <SquaresFour size={16} weight="duotone" />
                  Dashboard
                </a>
              )}
              {!isMainDomain && (
                <a
                  href="/support"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Compass size={16} weight="duotone" />
                  Support Hub
                </a>
              )}
              {hasTicketing && (
                <>
                  <a
                    href="/support/tickets"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ListChecks size={16} weight="duotone" />
                    My Tickets
                  </a>
                  <a
                    href="/support/ticket"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <Ticket size={16} weight="duotone" />
                    Submit Ticket
                  </a>
                </>
              )}
              <hr className="my-1 border-[var(--border-primary)]" />
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-md text-red-400 hover:bg-[var(--bg-tertiary)] hover:text-red-300 transition-colors disabled:opacity-50"
              >
                <SignOut size={16} weight="bold" />
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

  // Navigation links shared between desktop and mobile
  const navLinks = (
    <>
      {hasPricingPage && (
        <Link
          href={urls.pricing}
          onClick={() => setMobileMenuOpen(false)}
          className={`transition ${
            pathname === urls.pricing
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Pricing
        </Link>
      )}
      <Link
        href={urls.support}
        onClick={() => setMobileMenuOpen(false)}
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
          onClick={() => setMobileMenuOpen(false)}
          className={`transition ${
            pathname === urls.contact
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Contact
        </Link>
      )}
    </>
  );

  return (
    <header className="border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[var(--text-primary)]">
          {siteName}
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks}
          <div className="min-w-[118px] h-[38px] flex items-center justify-end">
            {renderActionButton()}
          </div>
        </div>

        {/* Mobile: action button + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          {renderActionButton()}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-primary)] bg-[var(--bg-primary)]/95 backdrop-blur-sm animate-slide-down">
          <div className="flex flex-col gap-1 px-4 py-3">
            {hasPricingPage && (
              <a
                href={urls.pricing}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg transition ${
                  pathname === urls.pricing
                    ? 'text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                Pricing
              </a>
            )}
            <a
              href={urls.support}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg transition ${
                pathname.startsWith('/support')
                  ? 'text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              Support
            </a>
            {hasContactPage && (
              <a
                href={urls.contact}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg transition ${
                  pathname === urls.contact
                    ? 'text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                Contact
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
