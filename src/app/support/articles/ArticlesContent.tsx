'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArticleCard } from '@/components/support/ArticleCard';
import { Article, ArticleCategory } from '@/types';
import { X, MagnifyingGlass, Sparkle } from '@phosphor-icons/react';

interface ArticlesContentProps {
  articles: Article[];
  categories: ArticleCategory[];
}

// Simple search scoring function (matches the API logic)
function scoreArticle(article: Article, query: string): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  // Title match (highest priority)
  if (article.title.toLowerCase().includes(lowerQuery)) {
    score += article.title.toLowerCase() === lowerQuery ? 10 : 5;
  }

  // Keyword match
  if (article.keywords?.some(k => k.toLowerCase().includes(lowerQuery))) {
    score += 3;
  }

  // Content/excerpt match
  if (article.excerpt?.toLowerCase().includes(lowerQuery)) {
    score += 1;
  }

  return score;
}

export function ArticlesContent({ articles, categories }: ArticlesContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCategory = searchParams.get('category');
  const searchQuery = searchParams.get('q');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);

  const clearSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    router.push(`/support/articles${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const filteredArticles = useMemo(() => {
    let result = articles;

    // Apply search filter if query exists
    if (searchQuery && searchQuery.trim().length >= 2) {
      const query = searchQuery.trim();
      result = articles
        .map(article => ({ article, score: scoreArticle(article, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ article }) => article);
    }

    // Apply category filter
    if (selectedCategory) {
      result = result.filter(a => a.category === selectedCategory);
    }

    return result;
  }, [selectedCategory, articles, searchQuery]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Results Banner */}
      {searchQuery && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl">
          <MagnifyingGlass size={20} weight="bold" className="text-[var(--accent-primary)]" />
          <div className="flex-1">
            <span className="text-[var(--text-secondary)]">
              {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''} for{' '}
            </span>
            <span className="font-semibold text-[var(--text-primary)]">&ldquo;{searchQuery}&rdquo;</span>
          </div>
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
          >
            <X size={16} weight="bold" />
            Clear
          </button>
        </div>
      )}

      {/* Category Tabs - only show if there are categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.slug
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-4">
        {filteredArticles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-12 px-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          {articles.length === 0 ? (
            <>
              <div className="p-4 rounded-full bg-[var(--accent-primary)]/10 w-fit mx-auto mb-4">
                <Sparkle size={32} weight="duotone" className="text-[var(--accent-primary)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Coming Soon</h2>
              <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                We&apos;re setting up our knowledge base. Check back soon for helpful articles and guides.
              </p>
            </>
          ) : (
            <p className="text-[var(--text-secondary)]">No articles found matching your criteria.</p>
          )}
        </div>
      )}
    </div>
  );
}
