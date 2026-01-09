'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useHistory } from '@/lib/hooks/useHistory';
import { SearchHistoryItem, ViewHistoryItem } from '@/types';

interface HistoryContextType {
  recentSearches: SearchHistoryItem[];
  viewedArticles: ViewHistoryItem[];
  addSearch: (query: string) => void;
  addView: (item: Omit<ViewHistoryItem, 'timestamp'>) => void;
  clearHistory: () => void;
  isLoaded: boolean;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const history = useHistory();

  return (
    <HistoryContext.Provider value={history}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistoryContext() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistoryContext must be used within a HistoryProvider');
  }
  return context;
}

// Optional hook that returns null if not in provider (for components that may be used outside provider)
export function useOptionalHistoryContext() {
  return useContext(HistoryContext);
}
