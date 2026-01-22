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
import { MainHeader } from '@/components/layout/MainHeader';
import { MainFooter } from '@/components/layout/MainFooter';

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
      color: '#eab308',
      bgColor: '#eab308',
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
      color: '#6366f1',
      bgColor: '#6366f1',
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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <MainHeader siteName={siteName} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#12121a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <Sparkle size={16} weight="duotone" className="text-indigo-400" />
            <span className="text-sm font-medium text-indigo-400">Contact Us</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {pageTitle.includes(' ') ? (
              <>
                {pageTitle.split(' ').slice(0, -1).join(' ')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  {pageTitle.split(' ').slice(-1)[0]}
                </span>
              </>
            ) : (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                {pageTitle}
              </span>
            )}
          </h1>

          <p className="text-lg text-white/60 max-w-2xl mx-auto">
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
                className="group relative rounded-2xl bg-[#16161f] border border-white/10 overflow-hidden hover:border-white/20 transition-all"
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
                      style={{ backgroundColor: `${channel.bgColor}20` }}
                    >
                      <Icon size={28} weight="duotone" style={{ color: channel.color }} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-white/50">
                        <Clock size={14} weight="duotone" />
                        {channel.responseTime}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-white/60 mb-4">
                    {channel.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {channel.features.map((feature, idx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-xs text-white/60"
                        >
                          <FeatureIcon size={12} weight="duotone" />
                          {feature.text}
                        </span>
                      );
                    })}
                  </div>

                  {/* Best for list */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-white mb-2">Best for:</p>
                    <ul className="space-y-1">
                      {channel.bestFor.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-white/60">
                          <CheckCircle size={16} weight="duotone" className="text-green-400 flex-shrink-0 mt-0.5" />
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
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold !text-white transition-all hover:opacity-90"
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
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Not sure which to choose?
            </h2>
            <p className="text-white/60">
              Here&apos;s a quick guide to help you pick the right channel
            </p>
          </div>

          <div className="space-y-4">
            {decisionGuide.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl bg-[#16161f] border border-white/10"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      {item.question}
                    </h3>
                    <p className="text-white/60">
                      {item.answer}
                    </p>
                  </div>
                  <Link
                    href={item.action.href}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 font-medium hover:bg-indigo-500/20 transition-colors"
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
          <div className="rounded-2xl bg-gradient-to-r from-[#16161f] to-[#1a1a24] border border-white/10 p-8">
            <h2 className="text-xl font-bold text-white mb-6 text-center">
              Response Time Expectations
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-indigo-400 mb-1">Discord</div>
                <div className="text-sm text-white/60">Usually within hours</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-yellow-400 mb-1">Tickets</div>
                <div className="text-sm text-white/60">24-48 hours</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-purple-400 mb-1">Email</div>
                <div className="text-sm text-white/60">2-3 business days</div>
              </div>
            </div>

            <p className="text-center text-sm text-white/40 mt-6">
              Response times are during business hours (Mon-Fri, 9am-6pm). Discord community support may vary.
            </p>
          </div>
        </section>
      )}

      <MainFooter siteName={siteName} />
    </div>
  );
}
