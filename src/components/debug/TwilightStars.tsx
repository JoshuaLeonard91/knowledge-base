'use client';

import { useMemo } from 'react';

/**
 * Shooting stars that streak across the sky on the twilight theme.
 * Thin bright trails with randomized angles, speeds, and timing.
 * Hidden via CSS when data-theme is not "twilight".
 */

const STAR_COUNT = 8;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface StarConfig {
  top: number;
  left: number;
  angle: number;
  length: number;
  duration: number;
  delay: number;
  useSecondary: boolean;
}

export function TwilightStars() {
  const stars = useMemo<StarConfig[]>(() =>
    Array.from({ length: STAR_COUNT }, () => ({
      top: randomBetween(5, 60),
      left: randomBetween(10, 90),
      angle: randomBetween(200, 250),
      length: randomBetween(60, 120),
      duration: randomBetween(1.5, 3),
      delay: randomBetween(0, 18),
      useSecondary: Math.random() > 0.65,
    })),
  []);

  return (
    <div className="twilight-stars-container">
      {stars.map((s, i) => (
        <div
          key={i}
          className="twilight-star"
          aria-hidden="true"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.length}px`,
            transform: `rotate(${s.angle}deg)`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            background: `linear-gradient(90deg, ${s.useSecondary ? 'var(--accent-secondary)' : 'var(--accent-primary)'}, transparent)`,
          }}
        />
      ))}
    </div>
  );
}
