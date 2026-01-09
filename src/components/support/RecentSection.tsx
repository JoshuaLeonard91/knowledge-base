'use client';

import { useHistory } from '@/lib/hooks/useHistory';
import { MagnifyingGlass, Clock, FileText, Trash, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCategoryBadgeClasses } from '@/lib/category-colors';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export function RecentSection() {
  const { recentSearches, viewedArticles, clearHistory, isLoaded } = useHistory();
  const router = useRouter();

  // Don't render until loaded
  if (!isLoaded) return null;

  // Don't render if no history
  if (recentSearches.length === 0 && viewedArticles.length === 0) return null;

  const handleSearchClick = (query: string) => {
    router.push(`/support/articles?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock size={20} weight="duotone" className="text-[var(--text-muted)]" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Pick Up Where You Left Off</h2>
        </div>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent-error)] transition-colors"
        >
          <Trash size={14} weight="bold" />
          Clear history
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Recent Searches
            </h3>
            <div className="space-y-2">
              {recentSearches.map((item, index) => (
                <button
                  key={`${item.query}-${index}`}
                  onClick={() => handleSearchClick(item.query)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors group text-left"
                >
                  <MagnifyingGlass
                    size={18}
                    weight="bold"
                    className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors flex-shrink-0"
                  />
                  <span className="flex-1 text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
                    {item.query}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                  <ArrowRight
                    size={14}
                    weight="bold"
                    className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed */}
        {viewedArticles.length > 0 && (
          <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Recently Viewed
            </h3>
            <div className="space-y-2">
              {viewedArticles.map((item, index) => (
                <Link
                  key={`${item.slug}-${index}`}
                  href={`/support/articles/${item.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  <FileText
                    size={18}
                    weight="duotone"
                    className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
                      {item.title}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadgeClasses(item.category)}`}>
                      {item.category.replace('-', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
