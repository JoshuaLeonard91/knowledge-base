'use client';

import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlass, SpinnerGap, FileText, X } from '@phosphor-icons/react';
import Link from 'next/link';
import { SearchResult } from '@/types';
import { getCategoryBadgeClasses } from '@/lib/category-colors';
import { useOptionalHistoryContext } from './HistoryProvider';

interface SearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
  onResultClick?: () => void;
}

export function SearchBar({
  placeholder = "Search for help articles...",
  autoFocus = false,
  onResultClick
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyContext = useOptionalHistoryContext();

  const handleResultClick = () => {
    setIsOpen(false);
    // Track the search query in history
    if (historyContext && query.trim()) {
      historyContext.addSearch(query.trim());
    }
    onResultClick?.();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchArticles = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/articles/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.results);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchArticles, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <MagnifyingGlass size={20} weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-12 pr-12 py-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all text-lg"
        />
        {isLoading && (
          <SpinnerGap size={20} weight="bold" className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] animate-spin" />
        )}
        {!isLoading && query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X size={16} weight="bold" className="text-[var(--text-muted)]" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-lg overflow-hidden z-50 animate-slide-down">
          <div className="p-2">
            <p className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-1">
              {results.slice(0, 5).map((result) => (
                <Link
                  key={result.slug}
                  href={`/support/articles/${result.slug}`}
                  onClick={handleResultClick}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  <FileText size={20} weight="duotone" className="text-[var(--text-muted)] mt-0.5 group-hover:text-[var(--accent-primary)] transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                      {result.title}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] truncate mt-0.5">
                      {result.excerpt}
                    </p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded border text-xs font-medium capitalize ${getCategoryBadgeClasses(result.category)}`}>
                      {result.category.replace(/-/g, ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            {results.length > 5 && (
              <Link
                href={`/support/articles?q=${encodeURIComponent(query)}`}
                onClick={() => setIsOpen(false)}
                className="block text-center py-3 text-sm text-[var(--accent-primary)] hover:underline"
              >
                View all {results.length} results
              </Link>
            )}
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-lg p-6 text-center z-50 animate-slide-down">
          <p className="text-[var(--text-secondary)]">No articles found for &ldquo;{query}&rdquo;</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Try different keywords or browse categories</p>
        </div>
      )}
    </div>
  );
}
