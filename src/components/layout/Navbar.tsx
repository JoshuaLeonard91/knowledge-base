'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../auth/AuthProvider';
import { useTenant } from '@/lib/tenant/context';
import { DiscordLoginButton } from '../auth/DiscordLoginButton';
import { UserMenu } from './UserMenu';
import { List, X, Phone, House, CurrencyDollar, PaperPlaneTilt } from '@phosphor-icons/react';
import { getIcon } from '@/lib/icons';
import { useState, useMemo } from 'react';
import type { HeaderSettings, NavLink } from '@/lib/cms';

interface NavbarProps {
  settings: HeaderSettings;
  navLinks: NavLink[];
  hasContactPage: boolean;
  hasLandingPage: boolean;
  hasPricingPage: boolean;
}

export function Navbar({ settings, navLinks, hasContactPage, hasLandingPage, hasPricingPage }: NavbarProps) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const tenant = useTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isMainDomain = !tenant;

  // Get icon component from name, fallback to House
  const resolveIcon = (iconName: string) => getIcon(iconName, House);

  // Filter out contact/pricing/ticket links from CMS — we add our own below in fixed order
  const displayLinks = useMemo(() => {
    return navLinks.filter((link) => {
      if (link.url === '/support/contact' || link.url === '/contact') return false;
      if (link.url === '/pricing' || link.url === '/support/pricing') return false;
      if (link.url === '/support/ticket' || link.url === '/ticket') return false;
      return true;
    });
  }, [navLinks]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - goes to landing page if configured, otherwise support hub */}
          <Link href={isMainDomain || hasLandingPage ? '/' : '/support'} className="flex items-center gap-3 group shrink-0 min-w-0 max-w-[220px]">
            {settings.logoIcon ? (
              <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden shadow-lg group-hover:shadow-[var(--shadow-glow)] transition-shadow">
                <Image
                  src={settings.logoIcon}
                  alt={settings.siteName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg group-hover:shadow-[var(--shadow-glow)] transition-shadow">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            <div className="hidden sm:block min-w-0">
              <span className="text-lg font-bold text-[var(--text-primary)] block truncate">{settings.siteName}</span>
              <span className="text-xs text-[var(--text-muted)] block -mt-1 truncate">{settings.subtitle}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {displayLinks.map((link) => {
              const isActive = link.url === '/support' ? pathname === '/support' : pathname === link.url || (link.url !== '/' && pathname?.startsWith(link.url));
              const IconComponent = resolveIcon(link.icon);
              return (
                <Link
                  key={link.id}
                  href={link.url}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <IconComponent size={18} weight="duotone" />
                  {link.title}
                </Link>
              );
            })}
            {hasPricingPage && (
              <Link
                href="/support/pricing"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  pathname === '/pricing' || pathname === '/support/pricing'
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <CurrencyDollar size={18} weight="duotone" />
                Pricing
              </Link>
            )}
            {hasContactPage && (
              <Link
                href="/support/contact"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  pathname === '/contact' || pathname === '/support/contact'
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Phone size={18} weight="duotone" />
                Contact
              </Link>
            )}
            <Link
              href="/support/ticket"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                pathname === '/support/ticket'
                  ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <PaperPlaneTilt size={18} weight="duotone" />
              Submit Ticket
            </Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="hidden sm:block w-[160px] h-[38px] bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
            ) : user ? (
              <UserMenu />
            ) : (
              <div className="hidden sm:block">
                <DiscordLoginButton />
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            >
              {mobileMenuOpen ? (
                <X size={24} weight="bold" />
              ) : (
                <List size={24} weight="bold" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-primary)] animate-slide-down">
          <div className="px-4 py-4 space-y-2">
            {displayLinks.map((link) => {
              const isActive = link.url === '/support' ? pathname === '/support' : pathname === link.url || (link.url !== '/' && pathname?.startsWith(link.url));
              const IconComponent = resolveIcon(link.icon);
              return (
                <Link
                  key={link.id}
                  href={link.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <IconComponent size={20} weight="duotone" />
                  {link.title}
                </Link>
              );
            })}
            {hasPricingPage && (
              <Link
                href="/support/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/pricing' || pathname === '/support/pricing'
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <CurrencyDollar size={20} weight="duotone" />
                Pricing
              </Link>
            )}
            {hasContactPage && (
              <Link
                href="/support/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/contact' || pathname === '/support/contact'
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Phone size={20} weight="duotone" />
                Contact
              </Link>
            )}
            <Link
              href="/support/ticket"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                pathname === '/support/ticket'
                  ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <PaperPlaneTilt size={20} weight="duotone" />
              Submit Ticket
            </Link>
            {!user && !isLoading && (
              <div className="pt-2 border-t border-[var(--border-primary)]">
                <DiscordLoginButton />
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
