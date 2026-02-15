'use client';

/**
 * Page Transition Wrapper
 *
 * Provides smooth fade-in animation on client-side navigations only.
 * Skips animation on initial page load to prevent flash of invisible content.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const previousPathname = useRef(pathname);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Only animate on route changes, not initial load
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      const el = containerRef.current;
      if (el) {
        el.classList.remove('animate-page-enter');
        // Force reflow to restart animation
        void el.offsetWidth;
        el.classList.add('animate-page-enter');
      }
    }
  }, [pathname]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

/**
 * Staggered children animation wrapper
 * Each child animates in sequence with a slight delay.
 * Uses GPU-accelerated stagger-children class from globals.css.
 */
interface StaggeredContentProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggeredContent({
  children,
  className = '',
}: StaggeredContentProps) {
  return (
    <div className={`stagger-children ${className}`}>
      {children}
    </div>
  );
}
