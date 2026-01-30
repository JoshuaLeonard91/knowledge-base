'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SafeUser } from '@/lib/security/sanitize';

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  authMode: 'discord' | 'mock' | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'discord' | 'mock' | null>(null);
  const pathname = usePathname();

  // Check auth mode on mount
  useEffect(() => {
    async function checkAuthMode() {
      try {
        const res = await fetch('/api/auth/login');
        const data = await res.json();
        setAuthMode(data.mode || 'mock');
      } catch {
        setAuthMode('mock');
      }
    }
    checkAuthMode();
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
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

  // Re-check session on route changes to catch logouts from other pages
  useEffect(() => {
    checkSession();
  }, [checkSession, pathname]);

  const login = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      // Discord OAuth - redirect to Discord
      if (data.mode === 'discord' && data.redirectUrl) {
        window.location.href = data.redirectUrl;
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
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Get CSRF token for logout request
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();

      // Clear our session
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfData.csrf },
      });

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

  return (
    <AuthContext.Provider value={{ user, isLoading, authMode, login, logout, checkSession }}>
      {children}
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
