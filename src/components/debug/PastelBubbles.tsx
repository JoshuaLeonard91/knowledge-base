'use client';

import { useMemo } from 'react';

/**
 * Soft translucent bubbles that float upward on the pastel theme.
 * Gentle rising circles with randomized sizes, speeds, and positions.
 * Hidden via CSS when data-theme is not "pastel".
 */

const BUBBLE_COUNT = 10;
const PATHS = ['bubbleRise1', 'bubbleRise2', 'bubbleRise3', 'bubbleRise4'] as const;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface BubbleConfig {
  path: string;
  size: number;
  duration: number;
  delay: number;
  left: number;
  opacity: number;
  useSecondary: boolean;
}

export function PastelBubbles() {
  const bubbles = useMemo<BubbleConfig[]>(() =>
    Array.from({ length: BUBBLE_COUNT }, () => ({
      path: PATHS[Math.floor(Math.random() * PATHS.length)],
      size: randomBetween(8, 22),
      duration: randomBetween(12, 26),
      delay: randomBetween(0, 16),
      left: randomBetween(3, 97),
      opacity: randomBetween(0.08, 0.2),
      useSecondary: Math.random() > 0.5,
    })),
  []);

  return (
    <div className="pastel-bubbles-container">
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="pastel-bubble"
          aria-hidden="true"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}%`,
            animationName: b.path,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            borderColor: b.useSecondary ? 'var(--accent-secondary)' : 'var(--accent-primary)',
            background: `radial-gradient(circle at 35% 35%, ${b.useSecondary ? 'var(--accent-secondary)' : 'var(--accent-primary)'} 0%, transparent 70%)`,
            '--bubble-opacity': b.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
