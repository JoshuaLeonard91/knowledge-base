'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { List } from '@phosphor-icons/react';
import type { TocHeading } from '@/lib/utils/headings';

interface TableOfContentsProps {
  headings: TocHeading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isClickScrolling = useRef(false);

  useEffect(() => {
    if (headings.length === 0) return;

    const visibleIds = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id);
          } else {
            visibleIds.delete(entry.target.id);
          }
        });

        const firstVisible = headings.find((h) => visibleIds.has(h.id));
        if (firstVisible) {
          setActiveId(firstVisible.id);
        }
      },
      {
        rootMargin: '-100px 0px -60% 0px',
        threshold: 0,
      }
    );

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) {
        observerRef.current?.observe(el);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [headings]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    setActiveId(id);
    isClickScrolling.current = true;

    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });

    window.history.replaceState(null, '', `#${id}`);

    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  }, []);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav
      aria-label="Table of contents"
      className="flex flex-col max-h-[calc(100vh-10rem)] w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-lg shadow-black/5 p-4"
    >
      <div className="flex items-center gap-2.5 mb-4 px-1 shrink-0">
        <List size={18} weight="bold" className="text-[var(--text-muted)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          On this page
        </span>
      </div>
      <ul className="space-y-0.5 overflow-y-auto overscroll-contain pr-1 min-h-0">
        {headings.map((heading) => {
          const indent = heading.level - minLevel;
          const isActive = activeId === heading.id;

          return (
            <li key={heading.id}>
              <button
                onClick={() => handleClick(heading.id)}
                className={`
                  w-full text-left py-1.5 px-3 rounded-lg transition-all duration-150
                  border-l-2 -ml-px leading-snug
                  ${isActive
                    ? 'text-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 font-medium'
                    : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/50'
                  }
                `}
                style={{ paddingLeft: `${12 + indent * 12}px` }}
              >
                <span className="text-[0.8125rem]">{heading.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
