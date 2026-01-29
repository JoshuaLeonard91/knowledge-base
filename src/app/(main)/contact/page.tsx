/**
 * Contact Page (CMS-driven)
 *
 * Uses CMS for contact channels, response times, and page settings.
 * Uses CSS variables for theming consistency with landing page.
 */

import Link from 'next/link';
import * as PhosphorIcons from '@phosphor-icons/react/dist/ssr';
import {
  Clock,
  CheckCircle,
  CaretRight,
  Sparkle,
} from '@phosphor-icons/react/dist/ssr';
import { getHeaderData, getContactPageData } from '@/lib/cms';
import { getTenantFromRequest } from '@/lib/tenant';
import { LandingPageHeader, LandingPageFooter } from '@/components/landing';
import type { ContactChannel, ResponseTimeItem } from '@/types';

export const metadata = {
  title: 'Contact Us | Help Portal',
  description: 'Get in touch with us - submit a ticket, join our Discord, or reach out directly.',
};

// Helper to get Phosphor icon by name
function getPhosphorIcon(name: string): React.ComponentType<{ size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; className?: string; style?: React.CSSProperties }> {
  const icons = PhosphorIcons as Record<string, React.ComponentType<{ size?: number; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'; className?: string; style?: React.CSSProperties }>>;
  return icons[name] || icons.ChatCircle;
}

export default async function ContactPage() {
  const tenant = await getTenantFromRequest();
  const isMainDomain = !tenant;
  const [headerData, contactData] = await Promise.all([
    getHeaderData(),
    getContactPageData(),
  ]);

  const siteName = headerData.settings.siteName || 'Help Portal';
  // Tenant uses jira.connected, main domain uses JIRA_PROJECT_KEY env var
  const hasTicketing = tenant ? (tenant.jira?.connected ?? false) : !!process.env.JIRA_PROJECT_KEY;

  const { settings, channels, responseTimes } = contactData;

  // Page content with defaults
  const pageTitle = settings.pageTitle || 'Get in Touch';
  const pageSubtitle = settings.pageSubtitle || "Choose the best channel for your needs. We're here to help whether you prefer tickets, community support, or direct communication.";
  const showResponseTimes = settings.showResponseTimes !== false && responseTimes.length > 0;
  const responseSectionTitle = settings.responseSectionTitle || 'Response Time Expectations';
  const responseSectionNote = settings.responseSectionNote || 'Response times may vary based on complexity and current volume.';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <LandingPageHeader
        siteName={siteName}
        isMainDomain={isMainDomain}
        hasContactPage={headerData.hasContactPage}
        hasPricingPage={headerData.hasPricingPage}
        hasTicketing={hasTicketing}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--accent-primary)]/20 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--accent-primary)]/10 blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-6">
            <Sparkle size={16} weight="duotone" className="text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-[var(--accent-primary)]">Contact Us</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6">
            {pageTitle.includes(' ') ? (
              <>
                {pageTitle.split(' ').slice(0, -1).join(' ')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                  {pageTitle.split(' ').slice(-1)[0]}
                </span>
              </>
            ) : (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                {pageTitle}
              </span>
            )}
          </h1>

          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            {pageSubtitle}
          </p>
        </div>
      </section>

      {/* Channel Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className={`grid gap-6 ${channels.length === 1 ? 'max-w-md mx-auto' : channels.length === 2 ? 'lg:grid-cols-2 max-w-3xl mx-auto' : 'lg:grid-cols-3'}`}>
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      </section>

      {/* Response Time Expectations */}
      {showResponseTimes && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="rounded-2xl bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-primary)] p-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 text-center">
              {responseSectionTitle}
            </h2>

            <div className={`grid gap-4 ${responseTimes.length === 1 ? 'max-w-xs mx-auto' : responseTimes.length === 2 ? 'md:grid-cols-2 max-w-lg mx-auto' : 'md:grid-cols-3'}`}>
              {responseTimes.map((item) => (
                <ResponseTimeCard key={item.id} item={item} />
              ))}
            </div>

            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              {responseSectionNote}
            </p>
          </div>
        </section>
      )}

      <LandingPageFooter siteName={siteName} isMainDomain={isMainDomain} />
    </div>
  );
}

// Channel Card Component
function ChannelCard({ channel }: { channel: ContactChannel }) {
  const Icon = getPhosphorIcon(channel.icon);
  const isExternal = channel.external;
  const href = channel.url;

  return (
    <div
      className="group relative rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden hover:border-[var(--border-hover)] transition-all"
    >
      {/* Top accent bar */}
      <div
        className="h-1"
        style={{ backgroundColor: channel.color }}
      />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: `color-mix(in srgb, ${channel.color} 20%, transparent)` }}
          >
            <Icon size={28} weight="duotone" style={{ color: channel.color }} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              {channel.name}
            </h3>
            {channel.responseTime && (
              <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
                <Clock size={14} weight="duotone" />
                {channel.responseTime}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-[var(--text-secondary)] mb-4">
          {channel.description}
        </p>

        {/* Features */}
        {channel.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {channel.features.map((feature, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]"
              >
                <CheckCircle size={12} weight="duotone" className="text-[var(--accent-success)]" />
                {feature}
              </span>
            ))}
          </div>
        )}

        {/* Best for list */}
        {channel.bestFor.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Best for:</p>
            <ul className="space-y-1">
              {channel.bestFor.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircle size={16} weight="duotone" className="text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA Button */}
        {isExternal ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: channel.color, color: '#ffffff' }}
          >
            {channel.name}
            <CaretRight size={18} weight="bold" />
          </a>
        ) : (
          <Link
            href={href}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: channel.color, color: '#ffffff' }}
          >
            {channel.name}
            <CaretRight size={18} weight="bold" />
          </Link>
        )}
      </div>
    </div>
  );
}

// Response Time Card Component
function ResponseTimeCard({ item }: { item: ResponseTimeItem }) {
  return (
    <div className="text-center p-4">
      <div
        className="text-3xl font-bold mb-1"
        style={{ color: item.color }}
      >
        {item.label}
      </div>
      <div className="text-sm text-[var(--text-secondary)]">{item.time}</div>
    </div>
  );
}
