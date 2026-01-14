'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ServiceContactModal } from '@/components/support/ServiceContactModal';
import type { Service, ServiceTier, SLAHighlight } from '@/lib/cms';
import {
  ArrowRight, Check, CaretLeft, Sparkle, Star, BookOpenText, CaretRight,
  // Icon mapping for dynamic icons
  Wrench, Users, Headset, GearSix, Clock, Shield, Rocket, ChatCircleDots, Handshake,
  Code, CreditCard, User, Plug, Question, FileText, Lightning, Heart, Globe,
  CheckCircle, Gear, Phone, EnvelopeSimple, Database, Lock, ChartLine, Target
} from '@phosphor-icons/react';
import { IconProps } from '@phosphor-icons/react';

// Map icon names to components
const iconMap: Record<string, React.ComponentType<IconProps>> = {
  Wrench, Users, Headset, GearSix, Clock, Shield, Rocket, ChatCircleDots, Handshake,
  Code, CreditCard, User, Plug, Question, FileText, Lightning, Heart, Globe,
  CheckCircle, Gear, Phone, EnvelopeSimple, Database, Lock, ChartLine, Target,
  Check, Star, ArrowRight, BookOpenText,
};

// Get icon component by name
function getIcon(name: string): React.ComponentType<IconProps> {
  return iconMap[name] || Wrench;
}

interface ServicesContentProps {
  services: Service[];
  serviceTiers: ServiceTier[];
  slaHighlights: SLAHighlight[];
}

export function ServicesContent({ services, serviceTiers, slaHighlights }: ServicesContentProps) {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');

  const openContactModal = (serviceId?: string) => {
    setSelectedService(serviceId || '');
    setIsContactModalOpen(true);
  };

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
              Discord Solutions{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[#7289DA]">
                That Scale
              </span>
            </h1>

            <p className="text-lg text-[var(--text-secondary)] mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              From managed bot services to custom development, we provide comprehensive solutions to help your Discord community thrive.
            </p>

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

      {/* Services Grid
          Layout: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
          Recommended: 3-9 services (1-3 rows of 3)
          Max: 12 services for good UX
      */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">What We Offer</h2>
          <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
            Choose from our range of professional services designed to meet the needs of Discord communities of all sizes.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 stagger-children">
          {services.map((service) => {
            const Icon = getIcon(service.icon);
            return (
              <div
                key={service.id}
                className="group p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50 hover:shadow-[var(--shadow-glow)] transition-all"
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

                <p className="text-[var(--text-secondary)] mb-4">
                  {service.description}
                </p>

                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Check size={16} weight="bold" className="text-[var(--accent-success)] mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

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

                <button
                  onClick={() => openContactModal(service.id)}
                  className="btn btn-secondary w-full"
                >
                  Get Started
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* SLA Section - only show if we have tiers or highlights */}
      {(serviceTiers.length > 0 || slaHighlights.length > 0) && (
        <section className="bg-[var(--bg-secondary)] border-y border-[var(--border-primary)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Service Level Agreements</h2>
              <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
                We stand behind our services with clear, transparent SLAs that give you peace of mind.
              </p>
            </div>

            {/* SLA Highlights
                Layout: 2 cols (mobile) → 3 cols (tablet) → 5 cols (desktop)
                Recommended: 4-5 highlights
                Max: 6 highlights for single row on desktop
            */}
            {slaHighlights.length > 0 && (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 mb-16">
                {slaHighlights.map((highlight) => {
                  const Icon = getIcon(highlight.icon);
                  return (
                    <div
                      key={highlight.id}
                      className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-primary)] text-center"
                    >
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
                        <Icon size={24} weight="duotone" className="text-[var(--accent-primary)]" />
                      </div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-1 text-sm">{highlight.title}</h4>
                      <p className="text-xs text-[var(--text-muted)]">{highlight.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pricing Tiers
                Layout: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop) → 4 cols (xl)
                Recommended: 3 tiers (Free/Pro/Enterprise pattern)
                Max: 4 tiers - more becomes overwhelming for users
            */}
            {serviceTiers.length > 0 && (
              <div className={`grid gap-6 md:grid-cols-2 ${serviceTiers.length <= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
                {serviceTiers.map((tier, index) => (
                  <div
                    key={tier.id}
                    className={`relative p-6 rounded-2xl border transition-all ${
                      tier.highlighted
                        ? 'bg-gradient-to-b from-[var(--accent-primary)]/10 to-[var(--bg-primary)] border-[var(--accent-primary)] shadow-[var(--shadow-glow)]'
                        : 'bg-[var(--bg-primary)] border-[var(--border-primary)] hover:border-[var(--border-hover)]'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {tier.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--accent-primary)] text-white text-xs font-semibold flex items-center gap-1">
                        <Star size={12} weight="fill" />
                        Popular
                      </div>
                    )}

                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{tier.name}</h3>
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
                            className={`mt-0.5 flex-shrink-0 ${tier.highlighted ? 'text-[var(--accent-primary)]' : 'text-[var(--accent-success)]'}`}
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => openContactModal()}
                      className={`btn w-full ${tier.highlighted ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      Contact Sales
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Helpful Resources */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Helpful Resources</h2>
          <p className="text-[var(--text-secondary)]">
            Explore our knowledge base to learn more about what we offer.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/support/articles"
            className="group p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10">
                <BookOpenText size={20} weight="duotone" className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                  Knowledge Base
                </h3>
                <p className="text-sm text-[var(--text-muted)]">Browse all guides & tutorials</p>
              </div>
              <CaretRight size={16} className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
            </div>
          </Link>

          <Link
            href="/support/ticket"
            className="group p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-warning)] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--accent-warning)]/10">
                <ArrowRight size={20} weight="duotone" className="text-[var(--accent-warning)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-warning)] transition-colors">
                  Submit a Ticket
                </h3>
                <p className="text-sm text-[var(--text-muted)]">Get personalized support</p>
              </div>
              <CaretRight size={16} className="ml-auto text-[var(--text-muted)] group-hover:text-[var(--accent-warning)] transition-colors" />
            </div>
          </Link>

          <a
            href="#"
            className="group p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[#5865F2] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#5865F2]/10">
                <Star size={20} weight="duotone" className="text-[#5865F2]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[#5865F2] transition-colors">
                  Community Discord
                </h3>
                <p className="text-sm text-[var(--text-muted)]">Join our community</p>
              </div>
              <CaretRight size={16} className="ml-auto text-[var(--text-muted)] group-hover:text-[#5865F2] transition-colors" />
            </div>
          </a>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-[#7289DA] p-8 md:p-12">
          <div className="absolute inset-0 bg-grid opacity-10" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Ready to get started?
              </h2>
              <p className="text-white/80">
                Let&apos;s discuss how we can help your Discord community succeed.
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
      />
    </div>
  );
}
