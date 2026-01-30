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
        // Don't update active state while a click-scroll is in progress
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

    // Set active immediately on click
    setActiveId(id);
    isClickScrolling.current = true;

    // Calculate position accounting for sticky header offset (scroll-mt-28 = 7rem = 112px)
    const top = el.getBoundingClientRect().top + window.scrollY - 112;
    window.scrollTo({ top, behavior: 'smooth' });

    // Update URL hash
    window.history.replaceState(null, '', `#${id}`);

    // Re-enable observer tracking after scroll settles
    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  }, []);

  if (headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav aria-label="Table of contents" className="w-full">
      <div className="flex items-center gap-2.5 mb-5 px-1">
        <List size={18} weight="bold" className="text-[var(--text-muted)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          On this page
        </span>
      </div>
      <ul className="space-y-1">
        {headings.map((heading) => {
          const indent = heading.level - minLevel;
          const isActive = activeId === heading.id;

          return (
            <li key={heading.id}>
              <button
                onClick={() => handleClick(heading.id)}
                className={`
                  w-full text-left py-2 px-3.5 rounded-lg transition-all duration-150
                  border-l-2 -ml-px leading-snug
                  ${isActive
                    ? 'text-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 font-medium'
                    : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/50'
                  }
                `}
                style={{ paddingLeft: `${14 + indent * 14}px` }}
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
