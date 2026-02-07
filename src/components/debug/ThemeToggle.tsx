'use client';

import { useState, useEffect } from 'react';

const THEMES = ['dark', 'light'] as const;

export function ThemeToggle() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    const active = html.getAttribute('data-theme') || 'dark';
    const idx = THEMES.indexOf(active as typeof THEMES[number]);
    if (idx >= 0) setCurrent(idx);
  }, []);

  const cycle = () => {
    const next = (current + 1) % THEMES.length;
    const theme = THEMES[next];
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme !== 'light');
    setCurrent(next);
  };

  return (
    <button
      onClick={cycle}
      className="fixed bottom-4 left-4 z-[9999] px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-white/10 hover:bg-white/20 text-white backdrop-blur border border-white/20 transition"
    >
      theme: {THEMES[current]}
    </button>
  );
}
