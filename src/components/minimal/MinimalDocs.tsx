'use client';

import { useState, useEffect } from 'react';
import { CaretLeft, CaretRight, MagnifyingGlass, X, SpinnerGap } from '@phosphor-icons/react';
import { MinimalView } from './MinimalApp';
import { Article, ArticleCategory } from '@/types';

interface MinimalDocsProps {
  onNavigate: (view: MinimalView) => void;
  onBack: () => void;
}

export function MinimalDocs({ onNavigate, onBack }: MinimalDocsProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/articles');
        const data = await res.json();
        if (data.success) {
          setArticles(data.articles);
          setCategories(data.categories);
          if (data.categories.length > 0) {
            setExpandedCategory(data.categories[0].id);
          }
        }
      } catch {
        // Silently fail - will show empty state
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter articles by search
  const filteredArticles = searchQuery.length >= 2
    ? articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : articles;

  // Group by category
  const articlesByCategory = categories.map(category => ({
    category,
    articles: filteredArticles.filter(a => a.category === category.id),
  }));

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="min-h-[60vh]">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <CaretLeft size={18} weight="bold" />
        <span className="text-sm">Back</span>
      </button>

      {/* Header */}
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        Documentation
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <SpinnerGap size={24} weight="bold" className="text-[var(--accent-primary)] animate-spin" />
        </div>
      ) : (
      <>
      {/* Search */}
      <div className="relative mb-8">
        <MagnifyingGlass
          size={18}
          weight="bold"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search articles..."
          className="w-full pl-11 pr-10 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X size={16} weight="bold" className="text-[var(--text-muted)]" />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchQuery.length >= 2 ? (
        <div className="space-y-2">
          {filteredArticles.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8">
              No articles found for &quot;{searchQuery}&quot;
            </p>
          ) : (
            filteredArticles.map(article => (
              <button
                key={article.slug}
                onClick={() => onNavigate({ type: 'article', slug: article.slug })}
                className="w-full group flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] transition-all text-left"
              >
                <span className="flex-1 text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  {article.title}
                </span>
                <CaretRight
                  size={16}
                  weight="bold"
                  className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-all"
                />
              </button>
            ))
          )}
        </div>
      ) : (
        /* Category list */
        <div className="space-y-4">
          {articlesByCategory.map(({ category, articles: categoryArticles }) => (
            <div key={category.id}>
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <span className="font-semibold text-[var(--text-primary)]">
                  {category.name}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {categoryArticles.length} articles
                </span>
              </button>

              {expandedCategory === category.id && (
                <div className="pl-4 space-y-1 animate-fade-in">
                  {categoryArticles.map(article => (
                    <button
                      key={article.slug}
                      onClick={() => onNavigate({ type: 'article', slug: article.slug })}
                      className="w-full group flex items-center gap-2 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-left"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-hover)]" />
                      <span className="flex-1 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                        {article.title}
                      </span>
                      <CaretRight
                        size={14}
                        weight="bold"
                        className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
