'use client';

import { useEffect, useRef } from 'react';
import { useOptionalHistoryContext } from '@/components/support/HistoryProvider';

interface ArticleViewTrackerProps {
  slug: string;
  title: string;
  category: string;
}

export function ArticleViewTracker({ slug, title, category }: ArticleViewTrackerProps) {
  const historyContext = useOptionalHistoryContext();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    // Only track once per mount
    if (historyContext && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      historyContext.addView({ slug, title, category });
    }
  }, [historyContext, slug, title, category]);

  // Reset tracking when slug changes (navigating to different article)
  useEffect(() => {
    hasTrackedRef.current = false;
  }, [slug]);

  // This component doesn't render anything visible
  return null;
}
