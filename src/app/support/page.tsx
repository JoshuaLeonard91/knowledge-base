import Link from 'next/link';
import { SearchBar } from '@/components/support/SearchBar';
import { ArticleCard } from '@/components/support/ArticleCard';
import { CategoryList } from '@/components/support/CategoryList';
import { RecentSection } from '@/components/support/RecentSection';
import { getArticles, getCategories, hasServices } from '@/lib/cms';
import { BookOpenText, PaperPlaneTilt, DiscordLogo, CaretRight, Sparkle, Briefcase } from '@phosphor-icons/react/dist/ssr';

// Force dynamic rendering - fetches fresh data on every request
// Required for multi-tenant setup where content changes without rebuilds
export const dynamic = 'force-dynamic';

export default async function SupportHub() {
  const [articles, categories, servicesEnabled] = await Promise.all([
    getArticles(),
    getCategories(),
    hasServices()
  ]);

  // Get featured articles (up to 3 from different categories)
  const seenCategories = new Set<string>();
  const featuredArticles = articles.filter(article => {
    if (seenCategories.has(article.category) || seenCategories.size >= 3) return false;
    seenCategories.add(article.category);
    return true;
  }).slice(0, 3);

  // Count articles per category
  const articleCounts = categories.reduce((acc, cat) => {
    acc[cat.id] = articles.filter(a => a.category === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-visible">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--accent-primary)]/10 blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-6 animate-fade-in">
            <Sparkle size={16} weight="duotone" className="text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-[var(--accent-primary)]">Help Center</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-6 animate-slide-up">
            How can we{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
              help you?
            </span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Search our knowledge base, browse articles, or get personalized support for your Discord integrations.
          </p>

          {/* Search Bar */}
          <div className="relative z-20 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <SearchBar autoFocus placeholder="Search for help articles, guides, troubleshooting..." />
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className={`grid gap-4 md:grid-cols-2 ${servicesEnabled ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} stagger-children`}>
          <Link
            href="/support/articles"
            className="group p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:shadow-[var(--shadow-glow)] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10">
                <BookOpenText size={24} weight="duotone" className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  Browse Articles
                </h3>
                <p className="text-sm text-[var(--text-muted)]">{articles.length} articles</p>
              </div>
            </div>
          </Link>

          {servicesEnabled && (
            <Link
              href="/support/services"
              className="group p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-success)] hover:shadow-[0_0_20px_rgba(35,134,54,0.3)] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[var(--accent-success)]/10">
                  <Briefcase size={24} weight="duotone" className="text-[var(--accent-success)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-success)] transition-colors">
                    Our Services
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">Plans & SLAs</p>
                </div>
              </div>
            </Link>
          )}

          <Link
            href="/support/ticket"
            className="group p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-warning)] hover:shadow-[0_0_20px_rgba(254,231,92,0.3)] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[var(--accent-warning)]/10">
                <PaperPlaneTilt size={24} weight="duotone" className="text-[var(--accent-warning)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-warning)] transition-colors">
                  Submit Ticket
                </h3>
                <p className="text-sm text-[var(--text-muted)]">Get support</p>
              </div>
            </div>
          </Link>

          <a
            href="#"
            className="group p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[#5865F2] hover:shadow-[0_0_20px_rgba(88,101,242,0.3)] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#5865F2]/10">
                <DiscordLogo size={24} weight="duotone" className="text-[#5865F2]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[#5865F2] transition-colors">
                  Join Discord
                </h3>
                <p className="text-sm text-[var(--text-muted)]">Community</p>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* Recent Searches & Viewed Articles - only show if there are articles */}
      {articles.length > 0 && <RecentSection />}

      {/* Categories - only show if configured */}
      {categories.length > 0 ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Browse by Category</h2>
              <p className="text-[var(--text-secondary)] mt-1">Find articles organized by topic</p>
            </div>
          </div>
          <CategoryList categories={categories} articleCounts={articleCounts} />
        </section>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center py-12 px-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="p-4 rounded-full bg-[var(--accent-primary)]/10 w-fit mx-auto mb-4">
              <Sparkle size={32} weight="duotone" className="text-[var(--accent-primary)]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Coming Soon</h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              We&apos;re setting up our knowledge base. Check back soon for helpful articles and guides.
            </p>
          </div>
        </section>
      )}

      {/* Featured Articles - only show if there are articles */}
      {featuredArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Popular Articles</h2>
              <p className="text-[var(--text-secondary)] mt-1">Start here for quick answers</p>
            </div>
            <Link
              href="/support/articles"
              className="flex items-center gap-1 text-[var(--accent-primary)] hover:underline text-sm font-medium"
            >
              View all <CaretRight size={16} weight="bold" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3 stagger-children">
            {featuredArticles.map((article) => article && (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] p-8 md:p-12">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-grid opacity-10" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Can&apos;t find what you&apos;re looking for?
              </h2>
              <p className="text-white/80">
                Our support team is ready to help with any questions or issues.
              </p>
            </div>
            <Link
              href="/support/ticket"
              className="flex-shrink-0 px-6 py-3 rounded-xl bg-white text-[var(--accent-primary)] font-semibold hover:bg-white/90 transition-colors shadow-lg"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
