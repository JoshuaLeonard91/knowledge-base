import Link from 'next/link';
import Image from 'next/image';
import { ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import type { FooterSettings, FooterLink } from '@/lib/cms';

interface FooterProps {
  settings: FooterSettings;
  links: FooterLink[];
}

export function Footer({ settings, links }: FooterProps) {
  // Filter links by section
  const quickLinks = links.filter(l => l.section === 'quickLinks').sort((a, b) => a.order - b.order);
  const resources = links.filter(l => l.section === 'resources').sort((a, b) => a.order - b.order);
  const community = links.filter(l => l.section === 'community').sort((a, b) => a.order - b.order);

  return (
    <footer className="border-t border-[var(--border-primary)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/support" className="flex items-center gap-3">
              {settings.logoIcon ? (
                <div className="w-10 h-10 rounded-xl overflow-hidden">
                  <Image
                    src={settings.logoIcon}
                    alt={settings.siteName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[#7289DA] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              <span className="text-lg font-bold text-[var(--text-primary)]">{settings.siteName}</span>
            </Link>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              {settings.tagline}
            </p>
          </div>

          {/* Quick Links */}
          {quickLinks.length > 0 && (
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-4">{settings.quickLinksTitle}</h4>
              <ul className="space-y-2">
                {quickLinks.map((link) => (
                  <li key={link.id}>
                    {link.external ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1"
                      >
                        {link.title}
                        <ArrowSquareOut size={12} weight="bold" />
                      </a>
                    ) : (
                      <Link
                        href={link.url}
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                      >
                        {link.title}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resources */}
          {resources.length > 0 && (
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-4">{settings.resourcesTitle}</h4>
              <ul className="space-y-2">
                {resources.map((link) => (
                  <li key={link.id}>
                    {link.external ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1"
                      >
                        {link.title}
                        <ArrowSquareOut size={12} weight="bold" />
                      </a>
                    ) : (
                      <Link
                        href={link.url}
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                      >
                        {link.title}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Community */}
          {community.length > 0 && (
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-4">{settings.communityTitle}</h4>
              <ul className="space-y-2">
                {community.map((link) => (
                  <li key={link.id}>
                    {link.external ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1"
                      >
                        {link.title}
                        <ArrowSquareOut size={12} weight="bold" />
                      </a>
                    ) : (
                      <Link
                        href={link.url}
                        className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                      >
                        {link.title}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--border-primary)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} {settings.copyrightText}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href={settings.privacyPolicyUrl}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              {...(settings.privacyPolicyUrl.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              Privacy Policy
            </a>
            <a
              href={settings.termsOfServiceUrl}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              {...(settings.termsOfServiceUrl.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
