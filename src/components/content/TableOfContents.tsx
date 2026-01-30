'use client';

import { useEffect, useState, useRef } from 'react';
import { List } from '@phosphor-icons/react';
import type { TocHeading } from '@/lib/utils/headings';

interface TableOfContentsProps {
  headings: TocHeading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    // Track which headings are currently visible
    const visibleIds = new Set<string>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleIds.add(entry.target.id);
          } else {
            visibleIds.delete(entry.target.id);
          }
        });

        // Set active to the first visible heading in document order
        const firstVisible = headings.find((h) => visibleIds.has(h.id));
        if (firstVisible) {
          setActiveId(firstVisible.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    // Observe all heading elements
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

  if (headings.length === 0) return null;

  // Find the minimum heading level to normalize indentation
  const minLevel = Math.min(...headings.map((h) => h.level));

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash without scrolling
      window.history.replaceState(null, '', `#${id}`);
      setActiveId(id);
    }
  };

  return (
    <nav aria-label="Table of contents" className="w-full">
      <div className="flex items-center gap-2 mb-4 px-1">
        <List size={16} weight="bold" className="text-[var(--text-muted)]" />
        <span className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          On this page
        </span>
      </div>
      <ul className="space-y-0.5">
        {headings.map((heading) => {
          const indent = heading.level - minLevel;
          const isActive = activeId === heading.id;

          return (
            <li key={heading.id}>
              <button
                onClick={() => handleClick(heading.id)}
                className={`
                  w-full text-left text-sm py-1.5 px-3 rounded-md transition-all duration-150
                  border-l-2 -ml-px
                  ${isActive
                    ? 'text-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 font-medium'
                    : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border-primary)]'
                  }
                `}
                style={{ paddingLeft: `${12 + indent * 12}px` }}
              >
                {heading.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
