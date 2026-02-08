'use client';

import { useMemo } from 'react';

/**
 * Shooting stars that streak diagonally across the sky on the twilight theme.
 * A bright head travels along a long path leaving a fading tail behind it.
 * Hidden via CSS when data-theme is not "twilight".
 */

const STAR_COUNT = 6;
const PATHS = ['starStreak1', 'starStreak2', 'starStreak3'] as const;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface StarConfig {
  path: string;
  top: number;
  left: number;
  duration: number;
  delay: number;
  tailLength: number;
  useSecondary: boolean;
}

export function TwilightStars() {
  const stars = useMemo<StarConfig[]>(() =>
    Array.from({ length: STAR_COUNT }, () => ({
      path: PATHS[Math.floor(Math.random() * PATHS.length)],
      top: randomBetween(5, 80),
      left: randomBetween(20, 80),
      duration: randomBetween(1.2, 2.5),
      delay: randomBetween(0, 20),
      tailLength: randomBetween(80, 150),
      useSecondary: Math.random() > 0.7,
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
            width: `${s.tailLength}px`,
            animationName: s.path,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            background: `linear-gradient(90deg, transparent, ${s.useSecondary ? 'var(--accent-secondary)' : 'var(--accent-primary)'} 70%, #fff)`,
          }}
        />
      ))}
    </div>
  );
}
