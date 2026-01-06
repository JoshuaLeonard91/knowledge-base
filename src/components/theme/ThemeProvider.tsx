'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type UIMode = 'classic' | 'minimal';

interface ThemeContextType {
  uiMode: UIMode;
  setUIMode: (mode: UIMode) => void;
  toggleUIMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [uiMode, setUIModeState] = useState<UIMode>('classic');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load preference from localStorage
    const saved = localStorage.getItem('ui-mode') as UIMode | null;
    if (saved && (saved === 'classic' || saved === 'minimal')) {
      setUIModeState(saved);
    }
  }, []);

  const setUIMode = (mode: UIMode) => {
    setUIModeState(mode);
    localStorage.setItem('ui-mode', mode);
  };

  const toggleUIMode = () => {
    const newMode = uiMode === 'classic' ? 'minimal' : 'classic';
    setUIMode(newMode);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ uiMode, setUIMode, toggleUIMode }}>
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
    };
  }
  return context;
}
