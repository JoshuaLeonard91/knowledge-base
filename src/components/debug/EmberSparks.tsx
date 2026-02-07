'use client';

import { useMemo } from 'react';

/**
 * Floating ember sparks that drift upward on the ember theme.
 * Small glowing amber particles with randomized paths, sizes, and timing.
 * Hidden via CSS when data-theme is not "ember".
 */

const SPARK_COUNT = 14;
const PATHS = ['emberRise1', 'emberRise2', 'emberRise3', 'emberRise4', 'emberRise5'] as const;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface SparkConfig {
  path: string;
  size: number;
  duration: number;
  delay: number;
  left: number;
  glow: number;
}

export function EmberSparks() {
  const sparks = useMemo<SparkConfig[]>(() =>
    Array.from({ length: SPARK_COUNT }, () => ({
      path: PATHS[Math.floor(Math.random() * PATHS.length)],
      size: randomBetween(2, 5),
      duration: randomBetween(8, 18),
      delay: randomBetween(0, 12),
      left: randomBetween(5, 95),
      glow: randomBetween(4, 10),
    })),
  []);

  return (
    <div className="ember-sparks-container">
      {sparks.map((s, i) => (
        <div
          key={i}
          className="ember-spark"
          aria-hidden="true"
          style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            left: `${s.left}%`,
            animationName: s.path,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            boxShadow: `0 0 ${s.glow}px ${s.glow / 2}px var(--accent-primary)`,
          }}
        />
      ))}
    </div>
  );
}
