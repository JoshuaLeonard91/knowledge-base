'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchHistoryItem, ViewHistoryItem } from '@/types';

const MAX_SEARCHES = 5;
const MAX_VIEWED = 5;
const DEBOUNCE_MS = 500;

interface UseHistoryReturn {
  recentSearches: SearchHistoryItem[];
  viewedArticles: ViewHistoryItem[];
  addSearch: (query: string) => void;
  addView: (item: Omit<ViewHistoryItem, 'timestamp'>) => void;
  clearHistory: () => void;
  isLoaded: boolean;
}

export function useHistory(): UseHistoryReturn {
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  const [viewedArticles, setViewedArticles] = useState<ViewHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to track current state for saves without causing re-renders
  const recentSearchesRef = useRef<SearchHistoryItem[]>([]);
  const viewedArticlesRef = useRef<ViewHistoryItem[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    recentSearchesRef.current = recentSearches;
  }, [recentSearches]);

  useEffect(() => {
    viewedArticlesRef.current = viewedArticles;
  }, [viewedArticles]);

  // Load history from preferences API on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/preferences', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success && data.preferences) {
          if (Array.isArray(data.preferences.recentSearches)) {
            const searches = data.preferences.recentSearches.slice(0, MAX_SEARCHES);
            setRecentSearches(searches);
            recentSearchesRef.current = searches;
          }
          if (Array.isArray(data.preferences.viewedArticles)) {
            const views = data.preferences.viewedArticles.slice(0, MAX_VIEWED);
            setViewedArticles(views);
            viewedArticlesRef.current = views;
          }
        }
      } catch {
        console.error('Failed to load history');
      } finally {
        setIsLoaded(true);
      }
    };

    loadHistory();
  }, []);

  // Debounced save to preferences API - stable reference, uses refs
  const saveHistory = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
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
            preferences: {
              recentSearches: recentSearchesRef.current,
              viewedArticles: viewedArticlesRef.current,
            },
          }),
        });
      } catch {
        console.error('Failed to save history');
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const addSearch = useCallback((query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    setRecentSearches((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        (item) => item.query.toLowerCase() !== trimmedQuery
      );
      // Add new search at the beginning
      const newSearches = [
        { query: trimmedQuery, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_SEARCHES);

      // Update ref and schedule save
      recentSearchesRef.current = newSearches;
      saveHistory();

      return newSearches;
    });
  }, [saveHistory]);

  const addView = useCallback((item: Omit<ViewHistoryItem, 'timestamp'>) => {
    if (!item.slug || !item.title) return;

    setViewedArticles((prev) => {
      // Check if already the most recent view (prevent duplicate calls)
      if (prev.length > 0 && prev[0].slug === item.slug) {
        return prev;
      }

      // Remove duplicate if exists
      const filtered = prev.filter((v) => v.slug !== item.slug);
      // Add new view at the beginning
      const newViews = [
        { ...item, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_VIEWED);

      // Update ref and schedule save
      viewedArticlesRef.current = newViews;
      saveHistory();

      return newViews;
    });
  }, [saveHistory]);

  const clearHistory = useCallback(() => {
    setRecentSearches([]);
    setViewedArticles([]);
    recentSearchesRef.current = [];
    viewedArticlesRef.current = [];
    saveHistory();
  }, [saveHistory]);

  return {
    recentSearches,
    viewedArticles,
    addSearch,
    addView,
    clearHistory,
    isLoaded,
  };
}
