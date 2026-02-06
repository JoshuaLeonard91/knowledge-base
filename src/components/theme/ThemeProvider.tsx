'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

type UIMode = 'classic' | 'minimal';

interface ThemeContextType {
  uiMode: UIMode;
  setUIMode: (mode: UIMode) => void;
  toggleUIMode: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [uiMode, setUIModeState] = useState<UIMode>('classic');
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch preferences from secure httpOnly cookie via API
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch('/api/preferences', {
          method: 'GET',
          credentials: 'include', // Include cookies
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.preferences?.uiMode) {
            setUIModeState(data.preferences.uiMode);
          }
        }
      } catch {
        // Failed to load preferences, use default
        console.warn('Failed to load preferences, using defaults');
      } finally {
        setMounted(true);
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, []);

  // Save preferences to secure httpOnly cookie via API
  const savePreferences = useCallback(async (mode: UIMode) => {
    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();
      await fetch('/api/preferences', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrf,
        },
        body: JSON.stringify({
          preferences: { uiMode: mode },
        }),
      });
    } catch {
      // Failed to save, but continue with local state
      console.warn('Failed to save preferences');
    }
  }, []);

  const setUIMode = useCallback((mode: UIMode) => {
    setUIModeState(mode);
    savePreferences(mode);
  }, [savePreferences]);

  const toggleUIMode = useCallback(() => {
    const newMode = uiMode === 'classic' ? 'minimal' : 'classic';
    setUIMode(newMode);
  }, [uiMode, setUIMode]);

  const contextValue = useMemo(
    () => ({ uiMode, setUIMode, toggleUIMode, isLoading }),
    [uiMode, setUIMode, toggleUIMode, isLoading]
  );

  // Prevent hydration mismatch - show nothing until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // Return default values if used outside provider (e.g., during static generation)
  if (context === undefined) {
    return {
      uiMode: 'classic' as const,
      setUIMode: () => {},
      toggleUIMode: () => {},
      isLoading: true,
    };
  }
  return context;
}
