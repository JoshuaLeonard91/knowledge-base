import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-primary)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/support" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[#7289DA] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-[var(--text-primary)]">Support Portal</span>
            </Link>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Get help with your Discord integrations and server management.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/support" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                  Support Hub
                </Link>
              </li>
              <li>
                <Link href="/support/articles" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                  Knowledge Base
                </Link>
              </li>
              <li>
                <Link href="/support/guide" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                  Get Help
                </Link>
              </li>
              <li>
                <Link href="/support/ticket" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors">
                  Submit Ticket
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1">
                  Documentation
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">Community</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1">
                  Discord Server
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1">
                  Twitter
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors flex items-center gap-1">
                  GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--border-primary)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} Support Portal. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
