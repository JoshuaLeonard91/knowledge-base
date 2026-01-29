/**
 * Root Page
 *
 * - Main domain: Shows the marketing landing page (CMS-driven)
 * - Tenant subdomain: Shows landing page if configured, otherwise redirects to /support
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTenantFromRequest } from '@/lib/tenant/resolver';
import { getHeaderData, getLandingPageContent, getLandingPageContentOrNull } from '@/lib/cms';
import { MainHeader } from '@/components/layout/MainHeader';
import { MainFooter } from '@/components/layout/MainFooter';
import { TenantLandingHeader } from '@/components/layout/TenantLandingHeader';
import { TenantLandingFooter } from '@/components/layout/TenantLandingFooter';

// Feature icon mapping
const featureIcons: Record<string, React.ReactNode> = {
  BookOpenText: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  BookOpen: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Rocket: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  Palette: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  Discord: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  ),
  Briefcase: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  Ticket: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  Lightning: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

// Color mapping for feature icons
const colorClasses: Record<string, { bg: string; text: string }> = {
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

// Color cycle for features (assigned by index)
const featureColorCycle = ['indigo', 'purple', 'blue', 'green', 'yellow', 'red'];

export default async function RootPage() {
  // Check if we're on a tenant subdomain
  const tenant = await getTenantFromRequest();

  // Tenant subdomain - check for optional landing page
  if (tenant) {
    const [tenantLandingContent, tenantHeaderData] = await Promise.all([
      getLandingPageContentOrNull(),
      getHeaderData(),
    ]);

    // No landing page configured - redirect to support hub
    if (!tenantLandingContent) {
      redirect('/support');
    }

    const tenantSiteName = tenantHeaderData.settings.siteName || tenant.name || 'Help Center';

    // Tenant has landing page configured - show it with its own header/footer
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <TenantLandingHeader siteName={tenantSiteName} />
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--accent-primary)]/20 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--accent-primary)]/10 blur-[120px]" />

          <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-[var(--text-primary)]">
              {tenantLandingContent.heroTitle}{' '}
              {tenantLandingContent.heroHighlight && (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                  {tenantLandingContent.heroHighlight}
                </span>
              )}
            </h1>

            <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10">
              {tenantLandingContent.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={tenantLandingContent.heroCtaLink}
                className="px-8 py-4 bg-[var(--accent-primary)] hover:opacity-90 rounded-xl font-semibold transition text-white text-lg"
              >
                {tenantLandingContent.heroCta}
              </Link>
              {tenantLandingContent.heroSecondaryCtaText && tenantLandingContent.heroSecondaryCtaLink && (
                <Link
                  href={tenantLandingContent.heroSecondaryCtaLink}
                  className="px-8 py-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl font-semibold transition text-[var(--text-secondary)] text-lg border border-[var(--border-primary)]"
                >
                  {tenantLandingContent.heroSecondaryCtaText}
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        {tenantLandingContent.features.length > 0 && (
          <section className="py-20 px-6 border-t border-[var(--border-primary)]">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-[var(--text-primary)]">
                {tenantLandingContent.featuresTitle}
              </h2>
              <p className="text-[var(--text-secondary)] text-center mb-16 max-w-2xl mx-auto">
                {tenantLandingContent.featuresSubtitle}
              </p>

              <div className="flex flex-wrap justify-center gap-8">
                {tenantLandingContent.features.map((feature, index) => {
                  const colorCycle = ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-success)', 'var(--accent-warning)'];
                  const color = colorCycle[index % colorCycle.length];
                  const icon = featureIcons[feature.icon || 'Lightning'];
                  return (
                    <div
                      key={`feature-${index}`}
                      className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-8 hover:border-[var(--accent-primary)]/30 hover:shadow-lg transition-all duration-300 w-full md:w-[calc(33.333%-1.5rem)] md:min-w-[280px] md:max-w-[360px]"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                        style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
                      >
                        <div style={{ color }}>{icon}</div>
                      </div>
                      <h3 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">{feature.title}</h3>
                      <p className="text-[var(--text-secondary)]">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 rounded-3xl border border-[var(--accent-primary)]/20 p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text-primary)]">
                {tenantLandingContent.ctaTitle}
              </h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
                {tenantLandingContent.ctaSubtitle}
              </p>
              <Link
                href={tenantLandingContent.ctaButtonLink}
                className="inline-block px-8 py-4 bg-[var(--accent-primary)] hover:opacity-90 rounded-xl font-semibold transition text-white text-lg hover:scale-105"
              >
                {tenantLandingContent.ctaButtonText}
              </Link>
            </div>
          </div>
        </section>

        <TenantLandingFooter siteName={tenantSiteName} />
      </div>
    );
  }

  // Main domain - show landing page
  const [headerData, content] = await Promise.all([
    getHeaderData(),
    getLandingPageContent(),
  ]);
  const siteName = headerData.settings.siteName || 'Help Portal';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <MainHeader siteName={siteName} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-500/10 blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-sm font-medium text-indigo-400">Now available</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-slide-up">
            {content.heroTitle}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              {content.heroHighlight}
            </span>
          </h1>

          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {content.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link
              href={content.heroCtaLink}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition !text-white text-lg"
            >
              {content.heroCta}
            </Link>
            {content.heroSecondaryCtaText && content.heroSecondaryCtaLink && (
              <Link
                href={content.heroSecondaryCtaLink}
                className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition text-white/80 text-lg"
              >
                {content.heroSecondaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 animate-slide-up">
            {content.featuresTitle}
          </h2>
          <p className="text-white/60 text-center mb-16 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.05s' }}>
            {content.featuresSubtitle}
          </p>

          <div className={`flex flex-wrap justify-center gap-8 stagger-children`}>
            {content.features.map((feature: { title: string; description: string; icon?: string }, index: number) => {
                // Assign color based on index (cycles through available colors)
                const colorName = featureColorCycle[index % featureColorCycle.length];
                const colors = colorClasses[colorName];
                const icon = featureIcons[feature.icon || 'Lightning'];
                return (
                  <div
                    key={`feature-${index}`}
                    className="bg-[#16161f] rounded-2xl border border-white/10 p-8 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 w-full md:w-[calc(33.333%-1.5rem)] md:min-w-[280px] md:max-w-[360px]"
                  >
                    <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-6`}>
                      <div className={colors.text}>{icon}</div>
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-white/60">{feature.description}</p>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-3xl border border-indigo-500/20 p-12 animate-scale-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {content.ctaTitle}
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              {content.ctaSubtitle}
            </p>
            <Link
              href={content.ctaButtonLink}
              className="inline-block px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition !text-white text-lg hover:scale-105"
            >
              {content.ctaButtonText}
            </Link>
          </div>
        </div>
      </section>

      <MainFooter siteName={siteName} />
    </div>
  );
}
