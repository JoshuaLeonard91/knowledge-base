'use client';

import { THEME_OPTIONS } from '@/lib/themes';

interface ThemeSelectorProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
  disabled?: boolean;
}

export function ThemeSelector({ selectedTheme, onSelect, disabled }: ThemeSelectorProps) {
  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {THEME_OPTIONS.map((theme) => {
        const isSelected = selectedTheme === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(theme.id)}
            className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              isSelected
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                : 'border-[var(--border-primary)] hover:border-[var(--border-hover)] bg-[var(--bg-tertiary)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Theme Preview */}
            <div
              className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-[var(--border-primary)]"
              style={{ backgroundColor: theme.colors.background }}
            >
              <div
                className="h-3 w-full"
                style={{ backgroundColor: theme.colors.surface }}
              />
              <div className="p-1.5 flex gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div
                  className="flex-1 h-2 rounded"
                  style={{ backgroundColor: theme.colors.surface }}
                />
              </div>
              <div className="px-1.5">
                <div
                  className="h-1.5 w-3/4 rounded"
                  style={{ backgroundColor: theme.colors.text, opacity: 0.3 }}
                />
              </div>
            </div>

            {/* Theme Name + Description */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--text-primary)]">{theme.name}</div>
              <div className="text-sm text-[var(--text-secondary)]">{theme.description}</div>
            </div>

            {/* Checkmark */}
            {isSelected && (
              <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
