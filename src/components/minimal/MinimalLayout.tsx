'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { DiscordLoginButton } from '@/components/auth/DiscordLoginButton';
import { SignOut } from '@phosphor-icons/react';

interface MinimalLayoutProps {
  children: React.ReactNode;
}

export function MinimalLayout({ children }: MinimalLayoutProps) {
  const { user, logout, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">Support</span>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {!isLoading && (
              <>
                {user ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatarUrl || '/avatars/default.png'}
                      alt={user.displayName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <span className="text-sm text-[var(--text-secondary)] hidden sm:inline">
                      {user.displayName}
                    </span>
                    <button
                      onClick={logout}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      title="Log out"
                    >
                      <SignOut size={18} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <DiscordLoginButton />
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-20 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          {children}
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="py-6 px-6 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Support Portal
        </p>
      </footer>
    </div>
  );
}
