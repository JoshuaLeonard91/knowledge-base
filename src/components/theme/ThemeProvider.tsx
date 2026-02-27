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

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: UIMode;
}

export function ThemeProvider({ children, initialMode }: ThemeProviderProps) {
  const hasServerData = initialMode !== undefined;
  const [uiMode, setUIModeState] = useState<UIMode>(initialMode ?? 'classic');
  const [isLoading, setIsLoading] = useState(!hasServerData);

  // Fetch preferences from secure httpOnly cookie via API (skipped when server-provided)
  useEffect(() => {
    if (hasServerData) return;

    async function loadPreferences() {
      try {
        const response = await fetch('/api/preferences', {
          method: 'GET',
          credentials: 'include',
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
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [hasServerData]);

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

  // Always provide context — initial render uses default 'classic' mode which
  // matches server render, avoiding hydration mismatch. Once preferences load,
  // only consumers of useTheme() re-render — not the entire tree.
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
