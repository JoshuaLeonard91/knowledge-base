'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle, Loader2 } from 'lucide-react';

interface ArticleFeedbackProps {
  articleSlug: string;
}

export function ArticleFeedback({ articleSlug }: ArticleFeedbackProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (helpful: boolean) => {
    setIsSubmitting(true);
    setFeedback(helpful ? 'helpful' : 'not-helpful');

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleSlug,
          helpful,
        }),
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-12 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-[var(--accent-success)]/10">
            <CheckCircle className="w-5 h-5 text-[var(--accent-success)]" />
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)]">Thanks for your feedback!</p>
            <p className="text-sm text-[var(--text-muted)]">Your input helps us improve our documentation.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
      <p className="font-medium text-[var(--text-primary)] mb-4">Was this article helpful?</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleFeedback(true)}
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            feedback === 'helpful'
              ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)] text-[var(--accent-success)]'
              : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-success)] hover:text-[var(--accent-success)]'
          }`}
        >
          {isSubmitting && feedback === 'helpful' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ThumbsUp className="w-4 h-4" />
          )}
          Yes
        </button>
        <button
          onClick={() => handleFeedback(false)}
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            feedback === 'not-helpful'
              ? 'bg-[var(--accent-danger)]/10 border-[var(--accent-danger)] text-[var(--accent-danger)]'
              : 'border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-danger)] hover:text-[var(--accent-danger)]'
          }`}
        >
          {isSubmitting && feedback === 'not-helpful' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ThumbsDown className="w-4 h-4" />
          )}
          No
        </button>
      </div>
    </div>
  );
}
