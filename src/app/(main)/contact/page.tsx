/**
 * Contact Page (CMS-driven)
 *
 * Uses CSS variables for theming consistency with landing page.
 */

import Link from 'next/link';
import {
  PaperPlaneTilt,
  DiscordLogo,
  Envelope,
  Clock,
  CheckCircle,
  CaretRight,
  Sparkle,
  ShieldCheck,
  Users,
  Lightning,
  Question,
  Headset,
} from '@phosphor-icons/react/dist/ssr';
import { getHeaderData, getContactPageSettings } from '@/lib/cms';
import { getTenantFromRequest } from '@/lib/tenant';
import { LandingPageHeader, LandingPageFooter } from '@/components/landing';

export const metadata = {
  title: 'Contact Us | Help Portal',
  description: 'Get in touch with us - submit a ticket, join our Discord, or reach out directly.',
};

// Default page content
const defaults = {
  pageTitle: 'Get in Touch',
  pageSubtitle: "Choose the best channel for your needs. We're here to help whether you prefer tickets, community support, or direct communication.",
  discordUrl: 'https://discord.gg/helpportal',
  emailAddress: 'support@helpportal.app',
};

export default async function ContactPage() {
  const tenant = await getTenantFromRequest();
  const isMainDomain = !tenant;
  const headerData = await getHeaderData();
  const settings = await getContactPageSettings();
  const siteName = headerData.settings.siteName || 'Help Portal';

  // CMS values with defaults
  const pageTitle = settings.pageTitle || defaults.pageTitle;
  const pageSubtitle = settings.pageSubtitle || defaults.pageSubtitle;
  const discordUrl = settings.discordUrl || defaults.discordUrl;
  const emailAddress = settings.emailAddress || defaults.emailAddress;

  // Channel toggles from CMS (default to enabled)
  const showTicket = settings.ticketChannel?.enabled !== false;
  const showDiscord = settings.discordChannel?.enabled !== false;
  const showEmail = settings.emailChannel?.enabled !== false;
  const showDecisionGuide = settings.showDecisionGuide !== false;
  const showResponseTimes = settings.showResponseTimes !== false;

  // Channel data
  const allChannels = [
    {
      id: 'ticket',
      enabled: showTicket,
      name: settings.ticketChannel?.name || 'Submit a Ticket',
      icon: PaperPlaneTilt,
      color: 'var(--accent-warning, #eab308)',
      bgColor: 'var(--accent-warning, #eab308)',
      href: `mailto:${emailAddress}?subject=Support%20Ticket`,
      external: true,
      bestFor: settings.ticketChannel?.bestFor || [
        'Technical issues requiring investigation',
        'Account-specific problems',
        'Bug reports with detailed logs',
        'Service requests or feature requests',
      ],
      responseTime: settings.ticketChannel?.responseTime || '24-48 hours',
      features: [
        { icon: ShieldCheck, text: 'Private & secure' },
        { icon: Clock, text: 'Tracked response' },
        { icon: CheckCircle, text: 'Full history' },
      ],
      description: settings.ticketChannel?.description || 'Best for complex issues that need detailed investigation. Your request is tracked and prioritized.',
    },
    {
      id: 'discord',
      enabled: showDiscord,
      name: settings.discordChannel?.name || 'Join Discord',
      icon: DiscordLogo,
      color: '#5865F2',
      bgColor: '#5865F2',
      href: discordUrl,
      external: true,
      bestFor: settings.discordChannel?.bestFor || [
        'Quick questions',
        'Community discussions',
        'General guidance',
        'Networking with other users',
      ],
      responseTime: settings.discordChannel?.responseTime || 'Usually within hours',
      features: [
        { icon: Users, text: 'Community support' },
        { icon: Lightning, text: 'Fast responses' },
        { icon: Question, text: 'Browse past answers' },
      ],
      description: settings.discordChannel?.description || 'Great for quick questions and community interaction. Get help from both staff and experienced community members.',
    },
    {
      id: 'email',
      enabled: showEmail,
      name: settings.emailChannel?.name || 'Email Us',
      icon: Envelope,
      color: 'var(--accent-primary)',
      bgColor: 'var(--accent-primary)',
      href: `mailto:${emailAddress}`,
      external: true,
      bestFor: settings.emailChannel?.bestFor || [
        'Business inquiries',
        'Partnership opportunities',
        'Billing questions',
        'Formal communication',
      ],
      responseTime: settings.emailChannel?.responseTime || '2-3 business days',
      features: [
        { icon: Headset, text: 'Direct to team' },
        { icon: ShieldCheck, text: 'Formal record' },
        { icon: CheckCircle, text: 'Detailed responses' },
      ],
      description: settings.emailChannel?.description || 'For business matters, partnerships, or when you need formal documentation of your communication.',
    },
  ];

  const channels = allChannels.filter(c => c.enabled);

  // Decision helper
  const decisionGuide = [
    {
      question: 'Need help with your account or billing?',
      answer: 'Email us directly for account-specific issues and billing inquiries.',
      action: { text: 'Send Email', href: `mailto:${emailAddress}` },
    },
    {
      question: 'Have a quick question?',
      answer: 'Try our Discord community for fast, informal help from staff and other users.',
      action: { text: 'Join Discord', href: discordUrl },
    },
    {
      question: 'Interested in partnerships or enterprise?',
      answer: 'Email us directly for business inquiries and partnership opportunities.',
      action: { text: 'Contact Sales', href: `mailto:${emailAddress}?subject=Partnership%20Inquiry` },
    },
    {
      question: 'Want to see what we offer?',
      answer: 'Check out our pricing page to see our plans and features.',
      action: { text: 'View Pricing', href: '/pricing' },
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <LandingPageHeader
        siteName={siteName}
        isMainDomain={isMainDomain}
        hasContactPage={headerData.hasContactPage}
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
        <div className="grid gap-6 lg:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channel.icon;

            return (
              <div
                key={channel.id}
                className="group relative rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden hover:border-[var(--border-hover)] transition-all"
              >
                {/* Top accent bar */}
                <div
                  className="h-1"
                  style={{ backgroundColor: channel.bgColor }}
                />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: `color-mix(in srgb, ${channel.bgColor} 20%, transparent)` }}
                    >
                      <Icon size={28} weight="duotone" style={{ color: channel.color }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
                        <Clock size={14} weight="duotone" />
                        {channel.responseTime}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[var(--text-secondary)] mb-4">
                    {channel.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {channel.features.map((feature, idx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]"
                        >
                          <FeatureIcon size={12} weight="duotone" />
                          {feature.text}
                        </span>
                      );
                    })}
                  </div>

                  {/* Best for list */}
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

                  {/* CTA Button */}
                  <a
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: channel.bgColor }}
                  >
                    {channel.name}
                    <CaretRight size={18} weight="bold" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Decision Helper */}
      {showDecisionGuide && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-4">
              Not sure which to choose?
            </h2>
            <p className="text-[var(--text-secondary)]">
              Here&apos;s a quick guide to help you pick the right channel
            </p>
          </div>

          <div className="space-y-4">
            {decisionGuide.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                      {item.question}
                    </h3>
                    <p className="text-[var(--text-secondary)]">
                      {item.answer}
                    </p>
                  </div>
                  <Link
                    href={item.action.href}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] font-medium hover:bg-[var(--accent-primary)]/20 transition-colors"
                  >
                    {item.action.text}
                    <CaretRight size={16} weight="bold" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Response Time Expectations */}
      {showResponseTimes && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="rounded-2xl bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border-primary)] p-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 text-center">
              Response Time Expectations
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-[#5865F2] mb-1">Discord</div>
                <div className="text-sm text-[var(--text-secondary)]">Usually within hours</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-[var(--accent-warning)] mb-1">Tickets</div>
                <div className="text-sm text-[var(--text-secondary)]">24-48 hours</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-[var(--accent-secondary)] mb-1">Email</div>
                <div className="text-sm text-[var(--text-secondary)]">2-3 business days</div>
              </div>
            </div>

            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              Response times are during business hours (Mon-Fri, 9am-6pm). Discord community support may vary.
            </p>
          </div>
        </section>
      )}

      <LandingPageFooter siteName={siteName} isMainDomain={isMainDomain} />
    </div>
  );
}
