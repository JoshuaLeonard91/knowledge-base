import { Suspense } from 'react';
import { SearchBar } from '@/components/support/SearchBar';
import { ArticlesContent } from './ArticlesContent';
import { Loader2 } from 'lucide-react';

function ArticlesLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-[var(--accent-primary)] animate-spin" />
    </div>
  );
}

export default function ArticlesPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-[var(--border-primary)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Knowledge Base
          </h1>
          <p className="text-[var(--text-secondary)] mb-6 max-w-2xl">
            Browse our comprehensive collection of help articles, guides, and tutorials.
          </p>
          <div className="max-w-xl">
            <SearchBar placeholder="Search articles..." />
          </div>
        </div>
      </section>

      <Suspense fallback={<ArticlesLoading />}>
        <ArticlesContent />
      </Suspense>
    </div>
  );
}
