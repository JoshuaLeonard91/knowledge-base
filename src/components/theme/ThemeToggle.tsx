'use client';

import { useTheme } from './ThemeProvider';
import { Layout, Sparkle } from '@phosphor-icons/react';

export function ThemeToggle() {
  const { uiMode, toggleUIMode } = useTheme();

  return (
    <button
      onClick={toggleUIMode}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] shadow-lg hover:shadow-[var(--shadow-glow)] transition-all group"
      title={`Switch to ${uiMode === 'classic' ? 'minimal' : 'classic'} view`}
    >
      <div className="relative w-5 h-5">
        {uiMode === 'classic' ? (
          <Sparkle
            size={20}
            weight="duotone"
            className="text-[var(--accent-primary)] group-hover:scale-110 transition-transform"
          />
        ) : (
          <Layout
            size={20}
            weight="duotone"
            className="text-[var(--accent-primary)] group-hover:scale-110 transition-transform"
          />
        )}
      </div>
      <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
        {uiMode === 'classic' ? 'Minimal' : 'Classic'}
      </span>
    </button>
  );
}
