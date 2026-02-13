'use client';

import { useState, useEffect, useCallback } from 'react';
import { CaretLeft, CaretRight, Quotes, ArrowUpRight } from '@phosphor-icons/react';
import type { Testimonial } from '@/lib/cms';

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
}

export function TestimonialsCarousel({ testimonials }: TestimonialsCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = testimonials.length;

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + count) % count);
  }, [count]);

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [paused, count, next]);

  if (count === 0) return null;

  // Get initials for fallback avatar
  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Show 1 card on mobile, 2 on desktop (if enough testimonials)
  // For simplicity, we show one at a time and transition between them
  const testimonial = testimonials[current];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Card */}
      <div className="max-w-2xl mx-auto">
        <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-8 sm:p-10">
          {/* Quote icon */}
          <Quotes
            size={32}
            weight="fill"
            className="text-[var(--accent-primary)] opacity-30 mb-4"
          />

          {/* Quote text */}
          <blockquote className="text-lg sm:text-xl text-[var(--text-primary)] leading-relaxed mb-6">
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>

          {/* Author */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {testimonial.pictureUrl ? (
              <img
                src={testimonial.pictureUrl}
                alt={testimonial.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-[var(--accent-primary)]/30"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[var(--accent-primary)]/15 flex items-center justify-center border-2 border-[var(--accent-primary)]/30">
                <span className="text-sm font-semibold text-[var(--accent-primary)]">
                  {getInitials(testimonial.name)}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              {testimonial.url ? (
                <a
                  href={testimonial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  {testimonial.name}
                  <ArrowUpRight size={14} weight="bold" className="opacity-50" />
                </a>
              ) : (
                <div className="font-semibold text-[var(--text-primary)]">
                  {testimonial.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            onClick={next}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all"
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current
                  ? 'bg-[var(--accent-primary)] w-6'
                  : 'bg-[var(--text-muted)]/30 hover:bg-[var(--text-muted)]/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
