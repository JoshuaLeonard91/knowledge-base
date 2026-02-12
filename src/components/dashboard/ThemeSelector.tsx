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
        const { background, surface, primary, text } = theme.colors;

        return (
          <button
            key={theme.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(theme.id)}
            className={`relative rounded-xl border-2 transition-all text-left overflow-hidden ${
              isSelected
                ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/20'
                : 'border-[var(--border-primary)] hover:border-[var(--border-hover)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Mini site preview — fully inline-styled with theme colors */}
            <div style={{ backgroundColor: background }}>
              {/* Navbar */}
              <div
                className="flex items-center gap-2 px-3 py-2"
                style={{ backgroundColor: surface, borderBottom: `1px solid ${text}12` }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: primary }}
                />
                <div
                  className="h-1.5 w-10 rounded-full"
                  style={{ backgroundColor: text, opacity: 0.4 }}
                />
                <div className="ml-auto flex gap-1.5">
                  <div
                    className="h-1.5 w-5 rounded"
                    style={{ backgroundColor: text, opacity: 0.25 }}
                  />
                  <div
                    className="h-1.5 w-5 rounded"
                    style={{ backgroundColor: text, opacity: 0.25 }}
                  />
                </div>
              </div>

              {/* Content area */}
              <div className="px-3 pt-3 pb-2 space-y-2">
                {/* Heading */}
                <div
                  className="h-2 w-3/5 rounded"
                  style={{ backgroundColor: text, opacity: 0.75 }}
                />
                {/* Text lines */}
                <div className="space-y-1">
                  <div
                    className="h-1 w-full rounded-full"
                    style={{ backgroundColor: text, opacity: 0.15 }}
                  />
                  <div
                    className="h-1 w-4/5 rounded-full"
                    style={{ backgroundColor: text, opacity: 0.15 }}
                  />
                </div>

                {/* Card row */}
                <div className="flex gap-1.5 pt-1">
                  <div
                    className="flex-1 rounded p-1.5"
                    style={{ backgroundColor: surface, border: `1px solid ${text}10` }}
                  >
                    <div
                      className="h-1 w-3/4 rounded-full"
                      style={{ backgroundColor: text, opacity: 0.3 }}
                    />
                    <div
                      className="h-1 w-1/2 rounded-full mt-1"
                      style={{ backgroundColor: text, opacity: 0.15 }}
                    />
                  </div>
                  <div
                    className="flex-1 rounded p-1.5"
                    style={{ backgroundColor: surface, border: `1px solid ${text}10` }}
                  >
                    <div
                      className="h-1 w-3/4 rounded-full"
                      style={{ backgroundColor: text, opacity: 0.3 }}
                    />
                    <div
                      className="h-1 w-1/2 rounded-full mt-1"
                      style={{ backgroundColor: text, opacity: 0.15 }}
                    />
                  </div>
                </div>

                {/* Button */}
                <div
                  className="h-2.5 w-12 rounded-sm"
                  style={{ backgroundColor: primary }}
                />
              </div>
            </div>

            {/* Label row */}
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ backgroundColor: surface }}
            >
              <div className="min-w-0">
                <div className="font-medium text-sm" style={{ color: text }}>
                  {theme.name}
                </div>
                <div className="text-xs truncate" style={{ color: text, opacity: 0.5 }}>
                  {theme.description}
                </div>
              </div>

              {/* Checkmark — always rendered to prevent layout shift */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 transition-all ${
                  isSelected ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundColor: primary }}
              >
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
