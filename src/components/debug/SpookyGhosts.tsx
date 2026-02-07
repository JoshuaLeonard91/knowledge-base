'use client';

import { useMemo } from 'react';

/**
 * Floating ghosts that wander the screen on the spooky theme.
 * Each ghost gets a randomized path, size, speed, and delay on mount.
 * Hidden via CSS when data-theme is not "spooky".
 */

const GHOST_COUNT = 6;
const PATHS = ['ghostPath1', 'ghostPath2', 'ghostPath3', 'ghostPath4', 'ghostPath5', 'ghostPath6'] as const;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface GhostConfig {
  path: string;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function SpookyGhosts() {
  const ghosts = useMemo<GhostConfig[]>(() =>
    Array.from({ length: GHOST_COUNT }, () => ({
      path: PATHS[Math.floor(Math.random() * PATHS.length)],
      size: randomBetween(1.5, 3.5),
      duration: randomBetween(16, 32),
      delay: randomBetween(0, 14),
      opacity: randomBetween(0.1, 0.3),
    })),
  []);

  return (
    <div className="spooky-ghosts-container">
      {ghosts.map((g, i) => (
        <div
          key={i}
          className="spooky-ghost"
          aria-hidden="true"
          style={{
            fontSize: `${g.size}rem`,
            animationName: g.path,
            animationDuration: `${g.duration}s`,
            animationDelay: `${g.delay}s`,
            '--ghost-opacity': g.opacity,
          } as React.CSSProperties}
        >
          👻
        </div>
      ))}
    </div>
  );
}
