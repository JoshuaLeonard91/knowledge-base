/**
 * Shared Landing Page Content
 *
 * Renders hero, features, and CTA sections using CSS variables for theming.
 * Used by both main domain and tenant subdomains.
 */

import Link from 'next/link';
import type { LandingPageContent } from '@/lib/cms';
import { getIconSSR } from '@/lib/icons-ssr';
import { Lightning } from '@phosphor-icons/react/dist/ssr';

// Color cycle for feature icons
const featureColorCycle = [
  'var(--accent-primary)',
  'var(--accent-secondary)',
  'var(--accent-success, var(--accent-primary))',
  'var(--accent-warning, var(--accent-secondary))',
];

interface LandingPageContentProps {
  content: LandingPageContent;
  showAnimations?: boolean;
}

export function LandingPageContent({ content, showAnimations = true }: LandingPageContentProps) {
  const animationClass = showAnimations ? 'animate-slide-up' : '';
  const animationFadeClass = showAnimations ? 'animate-fade-in' : '';
  const animationScaleClass = showAnimations ? 'animate-scale-in' : '';

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--accent-primary)]/20 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--accent-primary)]/10 blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32 text-center">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-8 ${animationFadeClass}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
            </span>
            <span className="text-sm font-medium text-[var(--accent-primary)]">Now available</span>
          </div>

          <h1 className={`text-5xl md:text-7xl font-bold mb-6 leading-tight text-[var(--text-primary)] ${animationClass}`}>
            {content.heroTitle}{' '}
            {content.heroHighlight && (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                {content.heroHighlight}
              </span>
            )}
          </h1>

          <p
            className={`text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 ${animationClass}`}
            style={showAnimations ? { animationDelay: '0.1s' } : undefined}
          >
            {content.heroSubtitle}
          </p>

          {/* Hero buttons - only show if at least one is configured */}
          {(content.heroButtonText && content.heroButtonUrl) || (content.heroSecondaryButtonText && content.heroSecondaryButtonUrl) ? (
            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${animationClass}`}
              style={showAnimations ? { animationDelay: '0.2s' } : undefined}
            >
              {content.heroButtonText && content.heroButtonUrl && (
                <Link
                  href={content.heroButtonUrl}
                  className="btn-primary px-8 py-4 rounded-xl font-semibold transition text-lg hover:opacity-90"
                >
                  {content.heroButtonText}
                </Link>
              )}
              {content.heroSecondaryButtonText && content.heroSecondaryButtonUrl && (
                <Link
                  href={content.heroSecondaryButtonUrl}
                  className="px-8 py-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-xl font-semibold transition text-[var(--text-secondary)] text-lg border border-[var(--border-primary)]"
                >
                  {content.heroSecondaryButtonText}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* Features Section */}
      {content.features && content.features.length > 0 && (
        <section className="py-20 px-6 border-t border-[var(--border-primary)]">
          <div className="max-w-6xl mx-auto">
            <h2 className={`text-3xl md:text-4xl font-bold text-center mb-4 text-[var(--text-primary)] ${animationClass}`}>
              {content.featuresTitle}
            </h2>
            <p
              className={`text-[var(--text-secondary)] text-center mb-16 max-w-2xl mx-auto ${animationClass}`}
              style={showAnimations ? { animationDelay: '0.05s' } : undefined}
            >
              {content.featuresSubtitle}
            </p>

            <div className="flex flex-wrap justify-center gap-8">
              {content.features.map((feature, index) => {
                const color = featureColorCycle[index % featureColorCycle.length];
                const Icon = getIconSSR(feature.icon || 'Lightning', Lightning);
                return (
                  <div
                    key={`feature-${index}`}
                    className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-8 hover:border-[var(--accent-primary)]/30 hover:shadow-lg hover:shadow-[var(--accent-primary)]/5 transition-all duration-300 w-full md:w-[calc(33.333%-1.5rem)] md:min-w-[280px] md:max-w-[360px]"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
                    >
                      <Icon size={24} weight="duotone" style={{ color }} />
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

      {/* CTA Section - only show if title or button is configured */}
      {(content.ctaTitle || (content.ctaButtonText && content.ctaButtonLink)) && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className={`bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 rounded-3xl border border-[var(--accent-primary)]/20 p-12 ${animationScaleClass}`}>
              {content.ctaTitle && (
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--text-primary)]">
                  {content.ctaTitle}
                </h2>
              )}
              {content.ctaSubtitle && (
                <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
                  {content.ctaSubtitle}
                </p>
              )}
              {content.ctaButtonText && content.ctaButtonLink && (
                <Link
                  href={content.ctaButtonLink}
                  className="btn-primary inline-block px-8 py-4 rounded-xl font-semibold transition text-lg hover:opacity-90 hover:scale-105"
                >
                  {content.ctaButtonText}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
