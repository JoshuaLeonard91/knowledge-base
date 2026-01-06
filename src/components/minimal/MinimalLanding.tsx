'use client';

import { BookOpenText, ChatCircle, CaretRight } from '@phosphor-icons/react';
import { MinimalView } from './MinimalApp';

interface MinimalLandingProps {
  onNavigate: (view: MinimalView) => void;
}

export function MinimalLanding({ onNavigate }: MinimalLandingProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
          How can we help?
        </h1>
        <p className="text-[var(--text-secondary)]">
          Find answers or get in touch with our team
        </p>
      </div>

      {/* Options */}
      <div className="w-full max-w-md space-y-3">
        <button
          onClick={() => onNavigate({ type: 'docs' })}
          className="w-full group flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
        >
          <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 group-hover:bg-[var(--accent-primary)]/20 transition-colors">
            <BookOpenText size={24} weight="duotone" className="text-[var(--accent-primary)]" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              Browse Documentation
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Guides, tutorials, and FAQs
            </p>
          </div>
          <CaretRight
            size={20}
            weight="bold"
            className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all"
          />
        </button>

        <button
          onClick={() => onNavigate({ type: 'wizard' })}
          className="w-full group flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
        >
          <div className="p-3 rounded-xl bg-[var(--accent-warning)]/10 group-hover:bg-[var(--accent-warning)]/20 transition-colors">
            <ChatCircle size={24} weight="duotone" className="text-[var(--accent-warning)]" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              I need help with something
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Walk through troubleshooting steps
            </p>
          </div>
          <CaretRight
            size={20}
            weight="bold"
            className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all"
          />
        </button>
      </div>
    </div>
  );
}
