'use client';

import { useMemo } from 'react';

/**
 * Pulsing fireflies that drift gently on the dusk theme.
 * Small glowing dots with randomized positions, pulse timing, and drift paths.
 * Hidden via CSS when data-theme is not "dusk".
 */

const FIREFLY_COUNT = 12;
const PATHS = ['fireflyDrift1', 'fireflyDrift2', 'fireflyDrift3', 'fireflyDrift4'] as const;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface FireflyConfig {
  path: string;
  size: number;
  driftDuration: number;
  pulseDuration: number;
  delay: number;
  top: number;
  left: number;
  glow: number;
  useSecondary: boolean;
}

export function DuskFireflies() {
  const fireflies = useMemo<FireflyConfig[]>(() =>
    Array.from({ length: FIREFLY_COUNT }, () => ({
      path: PATHS[Math.floor(Math.random() * PATHS.length)],
      size: randomBetween(3, 6),
      driftDuration: randomBetween(14, 28),
      pulseDuration: randomBetween(3, 6),
      delay: randomBetween(0, 10),
      top: randomBetween(5, 85),
      left: randomBetween(5, 95),
      glow: randomBetween(6, 14),
      useSecondary: Math.random() > 0.5,
    })),
  []);

  return (
    <div className="dusk-fireflies-container">
      {fireflies.map((f, i) => (
        <div
          key={i}
          className="dusk-firefly-drift"
          aria-hidden="true"
          style={{
            top: `${f.top}%`,
            left: `${f.left}%`,
            animationName: f.path,
            animationDuration: `${f.driftDuration}s`,
            animationDelay: `${f.delay}s`,
          }}
        >
          <div
            className="dusk-firefly"
            style={{
              width: `${f.size}px`,
              height: `${f.size}px`,
              animationDuration: `${f.pulseDuration}s`,
              boxShadow: `0 0 ${f.glow}px ${f.glow / 2}px ${f.useSecondary ? 'var(--accent-secondary)' : 'var(--accent-primary)'}`,
              background: f.useSecondary ? 'var(--accent-secondary)' : 'var(--accent-primary)',
            }}
          />
        </div>
      ))}
    </div>
  );
}
