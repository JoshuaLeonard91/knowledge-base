'use client';

import { useMemo } from 'react';

/**
 * Gentle snowfall that drifts down on the arctic theme.
 * Small white flakes with randomized paths, sizes, and timing.
 * Hidden via CSS when data-theme is not "arctic".
 */

const FLAKE_COUNT = 18;
const PATHS = ['snowFall1', 'snowFall2', 'snowFall3', 'snowFall4', 'snowFall5'] as const;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface FlakeConfig {
  path: string;
  size: number;
  duration: number;
  delay: number;
  left: number;
  opacity: number;
}

export function ArcticSnow() {
  const flakes = useMemo<FlakeConfig[]>(() =>
    Array.from({ length: FLAKE_COUNT }, () => ({
      path: PATHS[Math.floor(Math.random() * PATHS.length)],
      size: randomBetween(2, 5),
      duration: randomBetween(10, 22),
      delay: randomBetween(0, 15),
      left: randomBetween(2, 98),
      opacity: randomBetween(0.15, 0.45),
    })),
  []);

  return (
    <div className="arctic-snow-container">
      {flakes.map((f, i) => (
        <div
          key={i}
          className="arctic-flake"
          aria-hidden="true"
          style={{
            width: `${f.size}px`,
            height: `${f.size}px`,
            left: `${f.left}%`,
            animationName: f.path,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            '--flake-opacity': f.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
