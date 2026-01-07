'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  useEffect(() => {
    checkSession();
  }, [checkSession]);

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
      // For Discord OAuth, also sign out via NextAuth
      if (authMode === 'discord') {
        // Call NextAuth signout endpoint
        await fetch('/api/auth/signout', {
          method: 'POST',
          credentials: 'include',
        });
      }

      // Clear our session too
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
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
