import { Suspense } from 'react';
import { SearchBar } from '@/components/support/SearchBar';
import { ArticlesContent } from './ArticlesContent';
import { getArticles, getCategories } from '@/lib/cms';
import { SpinnerGap } from '@phosphor-icons/react/dist/ssr';

// Force dynamic rendering - fetches fresh data on every request
// Required for multi-tenant setup where content changes without rebuilds
export const dynamic = 'force-dynamic';

function ArticlesLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <SpinnerGap size={32} weight="bold" className="text-[var(--accent-primary)] animate-spin" />
    </div>
  );
}

export default async function ArticlesPage() {
  const [articles, categories] = await Promise.all([
    getArticles(),
    getCategories()
  ]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative overflow-visible border-b border-[var(--border-primary)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Knowledge Base
          </h1>
          <p className="text-[var(--text-secondary)] mb-6 max-w-2xl mx-auto">
            Browse our comprehensive collection of help articles, guides, and tutorials.
          </p>
          <div className="relative z-20 max-w-xl mx-auto">
            <SearchBar placeholder="Search articles..." />
          </div>
        </div>
      </section>

      <Suspense fallback={<ArticlesLoading />}>
        <ArticlesContent articles={articles} categories={categories} />
      </Suspense>
    </div>
  );
}
