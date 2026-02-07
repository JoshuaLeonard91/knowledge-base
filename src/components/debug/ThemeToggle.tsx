'use client';

import { useState, useEffect, useRef } from 'react';

const THEMES = [
  { id: 'dark', label: 'Midnight', icon: '🌙' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'spooky', label: 'Spooky', icon: '🎃' },
  { id: 'arctic', label: 'Arctic', icon: '❄️' },
  { id: 'dusk', label: 'Dusk', icon: '🌸' },
  { id: 'ember', label: 'Ember', icon: '🔥' },
  { id: 'twilight', label: 'Twilight', icon: '🌆' },
  { id: 'pastel', label: 'Pastel', icon: '🍬' },
  { id: 'oceanic', label: 'Oceanic', icon: '🌊' },
] as const;

export function ThemeToggle() {
  const [active, setActive] = useState('dark');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    setActive(current);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectTheme = (id: string) => {
    document.documentElement.setAttribute('data-theme', id);
    document.documentElement.classList.toggle('dark', id !== 'light');
    setActive(id);
    setOpen(false);
  };

  const current = THEMES.find((t) => t.id === active) || THEMES[0];

  return (
    <div ref={ref} className="fixed top-4 left-4 z-[9999]">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-black/40 hover:bg-black/60 text-white backdrop-blur border border-white/15 transition"
      >
        <span>{current.icon}</span>
        <span>{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 rounded-lg bg-black/80 backdrop-blur-lg border border-white/15 py-1 shadow-xl">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono transition text-left ${
                active === theme.id
                  ? 'text-white bg-white/15'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{theme.icon}</span>
              <span>{theme.label}</span>
              {active === theme.id && (
                <svg className="w-3 h-3 ml-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
