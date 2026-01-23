'use client';

/**
 * Route Progress Bar
 *
 * Shows a thin animated progress bar at the top of the page during route transitions.
 * Similar to YouTube/GitHub navigation feedback.
 */

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Track the current URL to detect changes
  const url = `${pathname}?${searchParams}`;

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setVisible(true);
    setProgress(0);

    // Animate progress quickly to 30%, then slow down
    setTimeout(() => setProgress(30), 50);
    setTimeout(() => setProgress(60), 200);
    setTimeout(() => setProgress(80), 400);
  }, []);

  const completeLoading = useCallback(() => {
    setProgress(100);

    // Hide after animation completes
    setTimeout(() => {
      setVisible(false);
      setIsLoading(false);
      setProgress(0);
    }, 300);
  }, []);

  // Listen for route changes
  useEffect(() => {
    // Complete loading when route changes
    if (isLoading) {
      completeLoading();
    }
  }, [url, completeLoading, isLoading]);

  // Intercept link clicks to start progress
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor) {
        const href = anchor.getAttribute('href');

        // Only handle internal navigation links
        if (href && href.startsWith('/') && !href.startsWith('/api')) {
          // Don't trigger for same-page anchors
          if (href === pathname || href.split('?')[0] === pathname.split('?')[0]) {
            return;
          }
          startLoading();
        }
      }
    };

    // Also handle programmatic navigation via router.push
    const handleBeforeUnload = () => {
      startLoading();
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname, startLoading]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent pointer-events-none"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full w-full origin-left bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-secondary)] to-[var(--accent-primary)]"
        style={{
          transform: `scaleX(${progress / 100})`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 0 10px var(--accent-primary), 0 0 5px var(--accent-primary)',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
