'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CaretDown, CaretRight, BookOpenText } from '@phosphor-icons/react';
import type { ArticleCategory } from '@/types';

interface NavArticle {
  slug: string;
  title: string;
  category: string;
}

interface ArticleNavSidebarProps {
  categories: ArticleCategory[];
  articles: NavArticle[];
  currentSlug: string;
}

export function ArticleNavSidebar({ categories, articles, currentSlug }: ArticleNavSidebarProps) {
  const currentArticle = articles.find(a => a.slug === currentSlug);
  const currentCategoryId = currentArticle?.category;

  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(currentCategoryId ? [currentCategoryId] : [])
  );

  const toggleCategory = (categoryId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  // Group articles by category id
  const articlesByCategory = new Map<string, NavArticle[]>();
  for (const article of articles) {
    const list = articlesByCategory.get(article.category) || [];
    list.push(article);
    articlesByCategory.set(article.category, list);
  }

  const visibleCategories = categories.filter(c => articlesByCategory.has(c.id));

  return (
    <nav
      aria-label="Article navigation"
      className="flex flex-col h-[min(600px,80vh)] w-72 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-lg shadow-black/5 p-4"
    >
      <div className="flex items-center gap-2.5 mb-4 px-1 shrink-0">
        <BookOpenText size={18} weight="bold" className="text-[var(--text-muted)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Articles
        </span>
      </div>

      <div className="overflow-y-auto overscroll-contain pr-1 min-h-0 space-y-1">
        {visibleCategories.map(category => {
          const isExpanded = expanded.has(category.id);
          const catArticles = articlesByCategory.get(category.id) || [];

          return (
            <div key={category.id}>
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
              >
                {isExpanded
                  ? <CaretDown size={14} weight="bold" className="text-[var(--text-muted)] shrink-0" />
                  : <CaretRight size={14} weight="bold" className="text-[var(--text-muted)] shrink-0" />
                }
                <span className="truncate">{category.name}</span>
                <span className="ml-auto text-xs text-[var(--text-muted)] shrink-0">{catArticles.length}</span>
              </button>

              {isExpanded && (
                <ul className="ml-2 space-y-0.5">
                  {catArticles.map(article => {
                    const isActive = article.slug === currentSlug;
                    return (
                      <li key={article.slug}>
                        <Link
                          href={`/support/articles/${article.slug}`}
                          className={`
                            block py-1.5 px-3 rounded-lg text-[0.8125rem] transition-all duration-150
                            border-l-2 -ml-px leading-snug
                            ${isActive
                              ? 'text-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 font-medium'
                              : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/50'
                            }
                          `}
                        >
                          {article.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
