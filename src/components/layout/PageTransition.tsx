'use client';

/**
 * Page Transition Wrapper
 *
 * Provides smooth fade-in and slide-up animations when page content changes.
 * Detects route changes and re-triggers animation.
 */

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const previousPathname = useRef(pathname);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first render - just fade in
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setIsAnimating(true);
      return;
    }

    // Detect route change
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;

      // Quick fade out
      setShouldRender(false);

      // Then fade in with new content
      requestAnimationFrame(() => {
        setShouldRender(true);
        setIsAnimating(true);
      });
    }
  }, [pathname]);

  // Reset animation state after animation completes
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 400); // Match animation duration

      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <div
      className={`${className} ${shouldRender ? 'page-transition-enter' : 'page-transition-exit'}`}
      style={{
        opacity: shouldRender ? 1 : 0,
        transform: shouldRender ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.25s ease-out, transform 0.3s ease-out',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Staggered children animation wrapper
 * Each child animates in sequence with a slight delay
 */
interface StaggeredContentProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number; // Delay between children in ms
}

export function StaggeredContent({
  children,
  className = '',
  staggerDelay = 50,
}: StaggeredContentProps) {
  const pathname = usePathname();
  const [key, setKey] = useState(0);

  // Re-key component on route change to trigger animation reset
  useEffect(() => {
    setKey((prev) => prev + 1);
  }, [pathname]);

  return (
    <div key={key} className={`stagger-animate ${className}`}>
      <style jsx>{`
        .stagger-animate > :global(*) {
          opacity: 0;
          animation: staggerSlideUp 0.4s ease forwards;
        }
        ${Array.from({ length: 12 }, (_, i) => `
          .stagger-animate > :global(*:nth-child(${i + 1})) {
            animation-delay: ${i * staggerDelay}ms;
          }
        `).join('')}
        @keyframes staggerSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {children}
    </div>
  );
}
