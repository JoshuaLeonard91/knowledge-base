'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../auth/AuthProvider';
import { useTenant } from '@/lib/tenant/context';
import { DiscordLoginButton } from '../auth/DiscordLoginButton';
import { UserMenu } from './UserMenu';
import {
  House,
  BookOpenText,
  PaperPlaneTilt,
  Briefcase,
  List,
  X,
  Gear,
  Question,
  ChatCircle,
  Envelope,
  Phone,
  Users,
  Star,
  Heart,
  Lightning,
  Shield,
  Code,
  Wrench,
  Article,
  CurrencyDollar,
  Tag,
  type Icon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { HeaderSettings, NavLink } from '@/lib/cms';

// Map icon names to Phosphor icons
const iconMap: Record<string, Icon> = {
  House,
  BookOpenText,
  PaperPlaneTilt,
  Briefcase,
  Gear,
  Question,
  ChatCircle,
  Envelope,
  Phone,
  Users,
  Star,
  Heart,
  Lightning,
  Shield,
  Code,
  Wrench,
  Article,
  CurrencyDollar,
  Tag,
};

interface NavbarProps {
  settings: HeaderSettings;
  navLinks: NavLink[];
}

export function Navbar({ settings, navLinks }: NavbarProps) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const tenant = useTenant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if we're on the main domain (no tenant)
  const isMainDomain = !tenant;

  // Check if we're on a support page (use /support/contact instead of /contact)
  const isOnSupportPage = pathname?.startsWith('/support');

  // Check if a Contact link is configured in CMS
  const hasContactLink = navLinks.some((link) => link.url === '/support/contact' || link.url === '/contact');

  // Get icon component from name, fallback to House
  const getIcon = (iconName: string): Icon => {
    return iconMap[iconName] || House;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo - goes to landing page on main domain, support hub on tenant */}
          <Link href={isMainDomain ? '/' : '/support'} className="flex items-center gap-3 group">
            {settings.logoIcon ? (
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg group-hover:shadow-[var(--shadow-glow)] transition-shadow">
                <Image
                  src={settings.logoIcon}
                  alt={settings.siteName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg group-hover:shadow-[var(--shadow-glow)] transition-shadow">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-[var(--text-primary)]">{settings.siteName}</span>
              <span className="text-xs text-[var(--text-muted)] block -mt-1">{settings.subtitle}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks
              // Filter out contact links - we add our own Contact link with context-aware URL
              .filter((link) => link.url !== '/support/contact' && link.url !== '/contact')
              .map((link) => {
                const isActive = pathname === link.url;
                const IconComponent = getIcon(link.icon);
                return (
                  <Link
                    key={link.id}
                    href={link.url}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
            {/* Contact link - only show if configured in CMS */}
            {hasContactLink && (
              <Link
                href={isMainDomain ? (isOnSupportPage ? '/support/contact' : '/contact') : '/support/contact'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === '/contact' || pathname === '/support/contact'
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <Phone size={18} weight="duotone" />
                Contact
              </Link>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-4">
            {!isLoading && (
              <>
                {user ? (
                  <UserMenu />
                ) : (
                  <div className="hidden sm:block">
                    <DiscordLoginButton />
                  </div>
                )}
              </>
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
            {navLinks
              // Filter out contact links - we add our own Contact link with context-aware URL
              .filter((link) => link.url !== '/support/contact' && link.url !== '/contact')
              .map((link) => {
                const isActive = pathname === link.url;
                const IconComponent = getIcon(link.icon);
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
            {/* Contact link - only show if configured in CMS */}
            {hasContactLink && (
              <Link
                href={isMainDomain ? (isOnSupportPage ? '/support/contact' : '/contact') : '/support/contact'}
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
