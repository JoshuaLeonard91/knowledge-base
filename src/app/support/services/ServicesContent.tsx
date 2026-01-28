'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ServiceContactModal } from '@/components/support/ServiceContactModal';
import { useIsMainSite } from '@/lib/tenant/context';
import type { Service, ServiceTier, SLAHighlight, HelpfulResource, ServicesPageContent, ContactSettings, InquiryType } from '@/lib/cms';
import {
  ArrowRight, Check, CaretLeft, Sparkle, Star, BookOpenText, CaretRight, CaretDown, CaretUp,
  // Icon mapping for dynamic icons
  Wrench, Users, Headset, GearSix, Clock, Shield, Rocket, ChatCircleDots, Handshake,
  Code, CreditCard, User, Plug, Question, FileText, Lightning, Heart, Globe,
  CheckCircle, Gear, Phone, EnvelopeSimple, Database, Lock, ChartLine, Target,
  CurrencyDollar, Tag
} from '@phosphor-icons/react';
import { IconProps } from '@phosphor-icons/react';

// Map icon names to components
const iconMap: Record<string, React.ComponentType<IconProps>> = {
  Wrench, Users, Headset, GearSix, Clock, Shield, Rocket, ChatCircleDots, Handshake,
  Code, CreditCard, User, Plug, Question, FileText, Lightning, Heart, Globe,
  CheckCircle, Gear, Phone, EnvelopeSimple, Database, Lock, ChartLine, Target,
  Check, Star, ArrowRight, BookOpenText, CurrencyDollar, Tag,
};

// Get icon component by name
function getIcon(name: string): React.ComponentType<IconProps> {
  return iconMap[name] || Wrench;
}

// Section IDs for navigation
const SECTIONS = {
  services: 'services',
  pricing: 'pricing',
  resources: 'resources',
} as const;

interface ServicesContentProps {
  services: Service[];
  serviceTiers: ServiceTier[];
  slaHighlights: SLAHighlight[];
  helpfulResources: HelpfulResource[];
  pageContent: ServicesPageContent;
  contactSettings: ContactSettings;
  inquiryTypes: InquiryType[];
}

export function ServicesContent({ services, serviceTiers, slaHighlights, helpfulResources, pageContent, contactSettings, inquiryTypes }: ServicesContentProps) {
  const router = useRouter();
  const isMainSite = useIsMainSite();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  const openContactModal = (serviceId?: string) => {
    setSelectedService(serviceId || '');
    setIsContactModalOpen(true);
  };

  // Handle button click
  // - If buttonUrl is set, redirect to that URL (works for both main site and tenants)
  // - On main site without buttonUrl, redirect to /pricing for internal checkout
  // - On tenant subdomains without buttonUrl, open contact modal
  const handleServiceClick = (service: Service) => {
    if (service.buttonUrl) {
      window.location.href = service.buttonUrl;
    } else if (isMainSite) {
      router.push('/pricing');
    } else {
      openContactModal(service.id);
    }
  };

  const handleTierClick = (tier: ServiceTier) => {
    if (tier.buttonUrl) {
      window.location.href = tier.buttonUrl;
    } else if (isMainSite) {
      router.push('/pricing');
    } else {
      openContactModal();
    }
  };

  const toggleServiceFeatures = (serviceId: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  // Build navigation items based on available content
  const navItems = [
    { id: SECTIONS.services, label: 'Services' },
    ...(serviceTiers.length > 0 || slaHighlights.length > 0 ? [{ id: SECTIONS.pricing, label: 'Pricing' }] : []),
    ...(helpfulResources.length > 0 ? [{ id: SECTIONS.resources, label: 'Resources' }] : []),
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--accent-primary)]/10 blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Back link */}
          <Link
            href="/support"
            className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
            Back to Support Hub
          </Link>

          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-6 animate-fade-in">
              <Sparkle size={16} weight="duotone" className="text-[var(--accent-primary)]" />
              <span className="text-sm font-medium text-[var(--accent-primary)]">Our Services</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6 animate-slide-up">
              {pageContent.heroTitle.includes(' ') ? (
                <>
                  {pageContent.heroTitle.split(' ').slice(0, -2).join(' ')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
                    {pageContent.heroTitle.split(' ').slice(-2).join(' ')}
                  </span>
                </>
              ) : (
                pageContent.heroTitle
              )}
            </h1>

            <p className="text-lg text-[var(--text-secondary)] mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              {pageContent.heroSubtitle}
            </p>

            {/* Section Navigation */}
            {navItems.length > 1 && (
              <div className="flex items-center justify-center gap-2 mb-8 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                {navItems.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
                  >
                    {item.label}
                    {index < navItems.length - 1 && (
                      <span className="ml-3 text-[var(--text-muted)]">·</span>
                    )}
                  </a>
                ))}
              </div>
            )}

            <button
              onClick={() => openContactModal()}
              className="btn btn-primary animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              Get Started
              <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id={SECTIONS.services} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">{pageContent.servicesTitle}</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            {pageContent.servicesSubtitle}
          </p>
        </div>

        <div className={`grid gap-6 stagger-children ${services.length === 1 ? 'max-w-md mx-auto' : services.length === 2 ? 'max-w-2xl mx-auto sm:grid-cols-1 md:grid-cols-2' : 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {services.map((service) => {
            const Icon = getIcon(service.icon);
            const isExpanded = expandedServices.has(service.id);
            const visibleFeatures = isExpanded ? service.features : service.features.slice(0, 3);
            const hasMoreFeatures = service.features.length > 3;

            return (
              <div
                key={service.id}
                className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50 hover:shadow-[var(--shadow-glow)] transition-all flex flex-col"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${service.color}20` }}
                  >
                    <Icon size={28} weight="duotone" style={{ color: service.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent-primary)] transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">{service.tagline}</p>
                  </div>
                </div>

                {/* Pricing indicator */}
                {service.priceLabel && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20">
                    <CurrencyDollar size={16} weight="bold" className="text-[var(--accent-success)]" />
                    <span className="text-sm font-medium text-[var(--accent-success)]">{service.priceLabel}</span>
                  </div>
                )}

                <p className="text-[var(--text-secondary)] mb-4">
                  {service.description}
                </p>

                {/* Features with expand/collapse */}
                <ul className="space-y-2 mb-2">
                  {visibleFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={16} weight="bold" className="text-[var(--accent-success)] mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {hasMoreFeatures && (
                  <button
                    onClick={() => toggleServiceFeatures(service.id)}
                    className="flex items-center gap-1 text-sm text-[var(--accent-primary)] hover:underline mb-4"
                  >
                    {isExpanded ? (
                      <>
                        <CaretUp size={14} weight="bold" />
                        Show less
                      </>
                    ) : (
                      <>
                        <CaretDown size={14} weight="bold" />
                        View all {service.features.length} features
                      </>
                    )}
                  </button>
                )}

                {!hasMoreFeatures && <div className="mb-4" />}

                {/* Related Guides */}
                {service.relatedArticles && service.relatedArticles.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpenText size={16} weight="duotone" className="text-[var(--accent-primary)]" />
                      <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Related Guides</span>
                    </div>
                    <div className="space-y-1">
                      {service.relatedArticles.map((slug) => (
                        <Link
                          key={slug}
                          href={`/support/articles/${slug}`}
                          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                        >
                          <CaretRight size={12} weight="bold" className="text-[var(--text-muted)]" />
                          {slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA Button - pushed to bottom */}
                <div className="mt-auto">
                  <button
                    onClick={() => handleServiceClick(service)}
                    className="btn btn-secondary w-full"
                  >
                    {service.buttonText || 'Get Started'}
                    <ArrowRight size={16} weight="bold" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SLA Section - only show if we have tiers or highlights */}
      {(serviceTiers.length > 0 || slaHighlights.length > 0) && (
        <section id={SECTIONS.pricing} className="bg-[var(--bg-secondary)] border-y border-[var(--border-primary)] scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">{pageContent.slaTitle}</h2>
              <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
                {pageContent.slaSubtitle}
              </p>
            </div>

            {/* SLA Highlights - Enhanced with value display */}
            {slaHighlights.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 mb-16">
                {slaHighlights.map((highlight) => {
                  const Icon = getIcon(highlight.icon);
                  return (
                    <div
                      key={highlight.id}
                      className="group p-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] text-center hover:border-[var(--accent-primary)]/50 hover:shadow-lg transition-all w-40 sm:w-44 flex flex-col"
                    >
                      {highlight.statValue ? (
                        // Display as large stat
                        <>
                          <div className="text-3xl font-bold text-[var(--accent-primary)] mb-2 group-hover:scale-110 transition-transform">
                            {highlight.statValue}
                          </div>
                          <h4 className="font-semibold text-[var(--text-primary)] mb-1 text-sm">{highlight.title}</h4>
                        </>
                      ) : (
                        // Display with icon
                        <>
                          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon size={28} weight="duotone" className="text-[var(--accent-primary)]" />
                          </div>
                          <h4 className="font-semibold text-[var(--text-primary)] mb-1">{highlight.title}</h4>
                        </>
                      )}
                      <p className="text-xs text-[var(--text-muted)] mt-auto">{highlight.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pricing Tiers - Enhanced with accent colors and pricing */}
            {serviceTiers.length > 0 && (
              <div className={`grid gap-6 md:grid-cols-2 ${serviceTiers.length <= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
                {serviceTiers.map((tier, index) => {
                  const accentColor = tier.accentColor || (tier.highlighted ? 'var(--accent-primary)' : 'var(--text-muted)');

                  return (
                    <div
                      key={tier.id}
                      className={`relative p-6 rounded-2xl border transition-all flex flex-col ${
                        tier.highlighted
                          ? 'bg-gradient-to-b from-[var(--accent-primary)]/10 to-[var(--bg-primary)] border-[var(--accent-primary)] shadow-[var(--shadow-glow)]'
                          : 'bg-[var(--bg-primary)] border-[var(--border-primary)] hover:border-[var(--border-hover)]'
                      }`}
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        borderColor: !tier.highlighted && tier.accentColor ? `${tier.accentColor}40` : undefined,
                      }}
                    >
                      {tier.highlighted && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--accent-primary)] text-white text-xs font-semibold flex items-center gap-1">
                          <Star size={12} weight="fill" />
                          Popular
                        </div>
                      )}

                      {/* Tier accent bar */}
                      {tier.accentColor && !tier.highlighted && (
                        <div
                          className="absolute top-0 left-6 right-6 h-1 rounded-b-full"
                          style={{ backgroundColor: tier.accentColor }}
                        />
                      )}

                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{tier.name}</h3>

                      {/* Price display */}
                      {tier.price && (
                        <div className="mb-4">
                          <span
                            className="text-2xl font-bold"
                            style={{ color: accentColor }}
                          >
                            {tier.price}
                          </span>
                        </div>
                      )}

                      <p className="text-sm text-[var(--text-secondary)] mb-6">{tier.description}</p>

                      {/* SLA Details */}
                      <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] mb-6 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--text-muted)]">Response Time</span>
                          <span className="font-medium text-[var(--text-primary)]">{tier.responseTime}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--text-muted)]">Availability</span>
                          <span className="font-medium text-[var(--text-primary)]">{tier.availability}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--text-muted)]">Support</span>
                          <span className="font-medium text-[var(--text-primary)]">{tier.supportChannels}</span>
                        </div>
                      </div>

                      {/* Features */}
                      <ul className="space-y-3 mb-6">
                        {tier.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                            <Check
                              size={16}
                              weight="bold"
                              className="mt-0.5 flex-shrink-0"
                              style={{ color: accentColor }}
                            />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {/* Button pushed to bottom */}
                      <div className="mt-auto">
                        <button
                          onClick={() => handleTierClick(tier)}
                          className={`btn w-full ${tier.highlighted ? 'btn-primary' : 'btn-secondary'}`}
                          style={!tier.highlighted && tier.accentColor ? {
                            borderColor: `${tier.accentColor}40`,
                            color: tier.accentColor,
                          } : undefined}
                        >
                          {tier.buttonText || 'Contact Sales'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Helpful Resources - CMS Driven, only show if resources exist */}
      {helpfulResources.length > 0 && (
        <section id={SECTIONS.resources} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{pageContent.resourcesTitle}</h2>
            <p className="text-[var(--text-secondary)]">
              {pageContent.resourcesSubtitle}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {helpfulResources.map((resource) => {
              const Icon = getIcon(resource.icon);
              const color = resource.color || 'var(--accent-primary)';
              const isExternal = resource.url.startsWith('http');
              const LinkComponent = isExternal ? 'a' : Link;
              const linkProps = isExternal ? { href: resource.url, target: '_blank', rel: 'noopener noreferrer' } : { href: resource.url };

              return (
                <LinkComponent
                  key={resource.id}
                  {...linkProps}
                  className="group p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] transition-all"
                  style={{ ['--hover-color' as string]: color }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${color}80`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg transition-colors"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon size={20} weight="duotone" style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <h3
                        className="font-semibold text-[var(--text-primary)] group-hover:transition-colors"
                        style={{ ['--tw-text-opacity' as string]: 1 }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = color;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '';
                        }}
                      >
                        {resource.title}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)]">{resource.description}</p>
                    </div>
                    <CaretRight
                      size={16}
                      className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </div>
                </LinkComponent>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] p-8 md:p-12">
          <div className="absolute inset-0 bg-grid opacity-10" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {pageContent.ctaTitle}
              </h2>
              <p className="text-white/80">
                {pageContent.ctaSubtitle}
              </p>
            </div>
            <button
              onClick={() => openContactModal()}
              className="flex-shrink-0 px-6 py-3 rounded-xl bg-white text-[var(--accent-primary)] font-semibold hover:bg-white/90 transition-colors shadow-lg"
            >
              Schedule a Call
            </button>
          </div>
        </div>
      </section>

      {/* Contact Modal */}
      <ServiceContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        preselectedService={selectedService}
        services={services}
        contactSettings={contactSettings}
        inquiryTypes={inquiryTypes}
      />
    </div>
  );
}
