'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../auth/AuthProvider';
import { DiscordLoginButton } from '../auth/DiscordLoginButton';
import { UserMenu } from './UserMenu';
import {
  House,
  BookOpenText,
  Compass,
  PaperPlaneTilt,
  List,
  X,
} from '@phosphor-icons/react';
import { useState } from 'react';

const navLinks = [
  { href: '/support', label: 'Support Hub', icon: House },
  { href: '/support/articles', label: 'Articles', icon: BookOpenText },
  { href: '/support/guide', label: 'Get Help', icon: Compass },
  { href: '/support/ticket', label: 'Submit Ticket', icon: PaperPlaneTilt },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/support" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[#7289DA] flex items-center justify-center shadow-lg group-hover:shadow-[var(--shadow-glow)] transition-shadow">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-[var(--text-primary)]">Support Portal</span>
              <span className="text-xs text-[var(--text-muted)] block -mt-1">Help Center</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <Icon size={18} weight="duotone" />
                  {link.label}
                </Link>
              );
            })}
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
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <Icon size={20} weight="duotone" />
                  {link.label}
                </Link>
              );
            })}
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
