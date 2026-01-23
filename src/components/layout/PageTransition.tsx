'use client';

/**
 * Page Transition Wrapper
 *
 * Provides smooth fade-in and slide-up animations when page content changes.
 * Uses GPU-accelerated CSS animations from globals.css for 60fps performance.
 */

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [key, setKey] = useState(0);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    // Re-key on route change to trigger fresh animation
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      setKey((prev) => prev + 1);
    }
  }, [pathname]);

  return (
    <div key={key} className={`animate-page-enter ${className}`}>
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
  const pathname = usePathname();
  const [key, setKey] = useState(0);

  // Re-key component on route change to trigger animation reset
  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [pathname]);

  return (
    <div key={key} className={`stagger-children ${className}`}>
      {children}
    </div>
  );
}
