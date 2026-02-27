'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, Suspense, ReactNode } from 'react';
import { SafeUser } from '@/lib/security/sanitize';
import { AuthNotification } from './AuthNotification';

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  authMode: 'discord' | 'mock' | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: SafeUser | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const hasServerData = initialUser !== undefined;
  const [user, setUser] = useState<SafeUser | null>(hasServerData ? (initialUser ?? null) : null);
  const [isLoading, setIsLoading] = useState(!hasServerData);
  const [authMode, setAuthMode] = useState<'discord' | 'mock' | null>(null);
  const skipMountFetch = useRef(hasServerData);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      // Silently treat rate-limited session checks as unauthenticated
      // (visibility-change listener will retry automatically)
      if (res.status === 429) {
        return;
      }
      const data = await res.json();
      if (data.authMode) setAuthMode(data.authMode);
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check session on mount + when tab becomes visible (catches logouts from other tabs)
  useEffect(() => {
    // Skip mount fetch when server already provided the user data
    if (skipMountFetch.current) {
      skipMountFetch.current = false;
    } else {
      checkSession();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkSession]);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check auth mode and handle accordingly — single call on user action,
      // not on every page mount.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      // Discord OAuth - redirect to Discord with current page as callback
      if (data.mode === 'discord') {
        const callbackUrl = window.location.pathname;
        window.location.href = `/api/auth/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        return;
      }

      // Mock mode - session created directly
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = async () => {
    setIsLoading(true);
    try {
      // Get CSRF token for logout request
      const csrfRes = await fetch('/api/auth/session');
      if (csrfRes.status === 429) {
        window.location.href = window.location.pathname + '?error=RateLimit';
        return;
      }
      if (!csrfRes.ok) throw new Error('Failed to fetch session');
      const csrfData = await csrfRes.json();

      // Clear our session
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfData.csrf },
      });

      if (res.status === 429) {
        window.location.href = window.location.pathname + '?error=RateLimit';
        return;
      }

      if (res.ok) {
        setUser(null);
        // Force a hard refresh to ensure all cached state is cleared
        // This is more reliable than just setting state
        window.location.href = '/';
      } else {
        console.error('Logout failed');
      }
    } catch {
      console.error('Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = useMemo(
    () => ({ user, isLoading, authMode, login, logout, checkSession }),
    [user, isLoading, authMode, login, logout, checkSession]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <Suspense fallback={null}>
        <AuthNotification />
      </Suspense>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
